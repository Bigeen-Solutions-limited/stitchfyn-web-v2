import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { groupOrderApi } from "../features/group-order/group-order.api";
import { keys } from "../query/keys";
import {
  Box,
  Typography,
  Autocomplete,
  TextField,
  Button,
  Grid,
  Card,
  Stack,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  alpha,
  Dialog,
  IconButton,
  SwipeableDrawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Alert,
  RadioGroup,
  Radio,
  FormControlLabel,
  FormLabel,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  BusinessCenter as SuitIcon,
  Checkroom as ShirtIcon,
  Straighten as TrousersIcon,
  Delete as DeleteIcon,
  EmojiEvents as EventIcon,
  TipsAndUpdates as IntelIcon,
  Category as CategoryIcon,
  Person as PersonIcon,
  ChevronRight as ChevronRightIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  AccessTimeFilled as TimeIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  Backspace as ClearFieldIcon,
  WarningAmberRounded as WarningIcon,
  CheckCircleRounded as CheckIcon,
} from "@mui/icons-material";
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { useCustomerSearch, useCreateCustomer, useCreateMeasurement } from "../features/customers/hooks/useCustomerIntake";
import { customersApi } from "../features/customers/customers.api";
import { measurementApi } from "../features/measurements/measurement.api";
import { useWorkflowTemplates } from "../features/workflow/hooks/useWorkflowTemplates";
import { useAuthStore } from "../features/auth/auth.store";
import { useStores, useStaffList } from "../features/auth/hooks/useStaff";
import { ordersApi } from "../features/orders/orders.api";
import { storesApi } from "../features/stores/stores.api";
import { useToastStore } from "../components/feedback/Toast";
import { useInventory } from "../features/inventory/useInventory";
import { truncateId, safeLocaleDate } from "../utils/format";
import { NumberField } from "../components/inputs/NumberField";
import { mapErrorCode } from "../utils/errorMapper";

// Picked in place of a stock material when the customer supplies the fabric
const OWN_FABRIC = "__customer_own_fabric__";
const OWN_FABRIC_LABEL = "Customer's own fabric";

type Step = "CLIENT_SELECTION" | "CLIENT_DETAILS" | "GARMENTS_TIMELINE" | "FABRIC_DETAILS" | "MEASUREMENTS" | "SUMMARY";

const getGarmentIcon = (templateName: string) => {
  const name = templateName.toLowerCase();
  if (name.includes('suit')) return <SuitIcon />;
  if (name.includes('shirt')) return <ShirtIcon />;
  if (name.includes('trouser') || name.includes('pant')) return <TrousersIcon />;
  return <ShirtIcon />; // Fallback
};

const getGarmentIconLarge = (templateName: string) => {
  const name = templateName.toLowerCase();
  if (name.includes('suit')) return <SuitIcon sx={{ fontSize: 40 }} />;
  if (name.includes('shirt')) return <ShirtIcon sx={{ fontSize: 40 }} />;
  if (name.includes('trouser') || name.includes('pant')) return <TrousersIcon sx={{ fontSize: 40 }} />;
  return <ShirtIcon sx={{ fontSize: 40 }} />;
};

export function NewOrderPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const user = useAuthStore((state) => state.user);
  const role = user?.role;
  const { data: stores } = useStores();
  const isStoreManager = role === 'MANAGER';
  const isTailor = role === 'TAILOR';
  // Managers and tailors create orders for their own store
  const userStoreId = user?.storeId;
  // ?groupId= creates the order inside a group order, which fixes the store and gives the lead tailor
  const groupId = searchParams.get("groupId") || undefined;
  const { data: group } = useQuery({
    queryKey: keys.groupOrders.detail(groupId ?? ''),
    queryFn: () => groupOrderApi.get(groupId!),
    enabled: !!groupId && (role === 'OWNER' || role === 'MANAGER'),
  });
  const { data: templates } = useWorkflowTemplates();
  const createCustomer = useCreateCustomer();
  const createMeasurement = useCreateMeasurement();


  const [step, setStep] = useState<Step>("CLIENT_SELECTION");
  const [searchQuery, setSearchQuery] = useState("");
  const { data: searchResults, isLoading: isSearching } = useCustomerSearch(searchQuery);

  // Form State
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [newCustomer, setNewCustomer] = useState<{ name: string; email: string; phone: string; notificationChannel: "whatsapp" | "sms" | "email" }>({ name: "", email: "", phone: "", notificationChannel: "whatsapp" });
  const [measurementEntries, setMeasurementEntries] = useState<{
    id: string;
    label: string;
    value: string;
    isTemplateField: boolean;
  }[]>([]);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [fabricDetails, setFabricDetails] = useState({
    fabricImageBase64: "",
    colorSwatch: "#000000",
    designNotes: ""
  });
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  // A group with a store decides where its orders are made
  const groupStoreId = group?.storeId ?? null;
  // With a single store there's nothing to choose
  const storeIdOrOnly = selectedStoreId || (stores?.length === 1 ? stores[0].id : "");
  const chosenStoreId = groupStoreId ?? storeIdOrOnly;
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [materialQuantity, setMaterialQuantity] = useState<number | "">("");
  // Unit for the garment's fabric quantity; separate from the material's own free-text unit.
  const [quantityUnit, setQuantityUnit] = useState<"yards" | "meters">("yards");
  const [eventOccasion, setEventOccasion] = useState("");
  const [garmentCategory, setGarmentCategory] = useState("");
  const [garmentTier, setGarmentTier] = useState<"STANDARD" | "COMPLEX" | "BESPOKE">("STANDARD");
  const [paymentIntentType, setPaymentIntentType] = useState("");

  const { data: inventory } = useInventory();
  // The customer brings their own fabric: nothing comes out of stock, but the quantity is still recorded,
  // because the customer confirms it before production can start
  const ownFabric = selectedMaterialId === OWN_FABRIC;
  const stockMaterialId = ownFabric ? "" : selectedMaterialId;
  const fabricName = ownFabric ? OWN_FABRIC_LABEL : inventory?.find(m => m.materialId === selectedMaterialId)?.name;
  const effectiveStoreId = role === 'OWNER' ? chosenStoreId : userStoreId || undefined;
  const { data: staff } = useStaffList({
    storeId: effectiveStoreId,
    enabled: !!effectiveStoreId || role === 'OWNER'
  });
  const [orderItems, setOrderItems] = useState<{
    templateId: string;
    estimatedTotalDurationHours: number;
    assignedTailorId?: string | null;
  }[]>([]);
  const [successOrder, setSuccessOrder] = useState<{ id: string } | null>(null);

  // Mobile Tailor Drawer State
  const [isTailorDrawerOpen, setIsTailorDrawerOpen] = useState(false);
  const [itemIndexForAssignment, setItemIndexForAssignment] = useState<number | null>(null);

  // Measurement Intelligence State
  const [autoSelectedMeasurement, setAutoSelectedMeasurement] = useState<{
    measurementId: string;
    takenAt: string;
  } | null>(null);
  const [isPreloadingProfile, setIsPreloadingProfile] = useState(false);
  const [newMeasurementLabel, setNewMeasurementLabel] = useState("");

  const activeMeasurementField = measurementEntries.find(e => e.id === activeEntryId)?.label || "";
  const entryRefs = useRef<Record<string, any>>({});
  // Profile measurements the tailor removed or renamed, so re-syncing the list doesn't bring them back
  const dismissedLabels = useRef(new Set<string>());
  const [editingLabel, setEditingLabel] = useState<{ id: string; draft: string } | null>(null);

  const handleEntryAutoAdvance = (currentId: string) => {
    const currentIndex = measurementEntries.findIndex(e => e.id === currentId);
    if (currentIndex < measurementEntries.length - 1) {
      const nextEntry = measurementEntries[currentIndex + 1];
      setActiveEntryId(nextEntry.id);
      entryRefs.current[nextEntry.id]?.focus();
    }
  };

  // Pre-load the customer when the URL has ?customerId=
  useEffect(() => {
    const customerId = searchParams.get("customerId");
    if (customerId && !selectedCustomer) {
      const loadCustomer = async () => {
        setIsPreloadingProfile(true);
        try {
          const profile = await queryClient.fetchQuery({
            queryKey: ['customers', 'detail', customerId],
            queryFn: () => customersApi.getCustomerProfile(customerId)
          });
          // The profile keeps the latest measurements beside the customer, not on it
          setSelectedCustomer({ ...profile.customer, latestMeasurement: profile.latestMeasurement });
          setStep("GARMENTS_TIMELINE");
        } catch (error) {
          console.error("Failed to pre-load customer profile", error);
          // Fall back to identification step silently
        } finally {
          setIsPreloadingProfile(false);
        }
      };
      loadCustomer();
    }
  }, [searchParams, queryClient, selectedCustomer]);

  // Adds the garment and checks whether the customer's saved measurements fit its template
  const handleTemplateSelection = async (template: any) => {
    const templateId = template.id;

    setOrderItems([...orderItems, {
      templateId: template.id,
      estimatedTotalDurationHours: 24,
      assignedTailorId: role === 'TAILOR' ? user?.id : null
    }]);

    if (selectedCustomer?.id) {
       try {
         const profile = await queryClient.fetchQuery({
           queryKey: ['customers', 'detail', selectedCustomer.id, { garmentTemplateId: templateId }],
           queryFn: () => customersApi.getCustomerProfile(selectedCustomer.id, templateId)
         });

         const { isUsable, measurementId, takenAt } = profile.measurementCompatibility ?? {};

         if (isUsable && measurementId) {
           setAutoSelectedMeasurement({
             measurementId,
             takenAt: takenAt ? takenAt.toString() : new Date().toISOString()
           });
           showToast("Measurement Intelligence", "Compatible existing measurements found and auto-selected.", "success");
         }
       } catch (error) {
         // Not critical: log it and let staff enter measurements by hand
         console.error("Measurement intelligence fetch failed", error);
       }
    }
  };

  const goToMeasurementsOrSummary = () => {
    if (autoSelectedMeasurement) {
      setStep("SUMMARY");
    } else {
      setStep("MEASUREMENTS");
    }
  };

  // Every measurement field needed by the selected garments, without duplicates
  const dynamicMeasurementFields = useMemo(() => {
    if (!templates || !orderItems || orderItems.length === 0) return [];
    const uniqueFields = new Set<string>();

    orderItems.forEach(item => {
      const templateDef: any = templates.find((t: any) => t.id === item.templateId);
      if (templateDef) {
        // Handle both camelCase and snake_case from backend definitions
        const measurements = templateDef.requiredMeasurements || templateDef["required_measurements"] || [];
        measurements.forEach((m: string) => uniqueFields.add(m));
      }
    });
    return Array.from(uniqueFields);
  }, [orderItems, templates]);

  // Keep the measurement list in step with the selected garments, pre-filled from the customer's profile
  useEffect(() => {
    setMeasurementEntries(prev => {
      const existingLabels = new Set(prev.map(e => e.label));
      const next = [...prev];
      let changed = false;

      const customerMeasurements = selectedCustomer?.latestMeasurement?.measurements || {};

      Object.entries(customerMeasurements).forEach(([label, value]) => {
        if (dismissedLabels.current.has(label)) return;
        if (!existingLabels.has(label)) {
          next.push({
            id: Math.random().toString(36).substr(2, 9),
            label: label,
            value: String(value),
            isTemplateField: false
          });
          existingLabels.add(label);
          changed = true;
        } else {
          // Only fill a value the tailor has left empty
          const idx = next.findIndex(e => e.label === label);
          if (idx !== -1 && next[idx].value === "") {
            next[idx].value = String(value);
            changed = true;
          }
        }
      });

      dynamicMeasurementFields.forEach(field => {
        if (!existingLabels.has(field)) {
          next.push({
            id: Math.random().toString(36).substr(2, 9),
            label: field,
            value: "",
            isTemplateField: true
          });
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [dynamicMeasurementFields, selectedCustomer]);

  const handleAddCustomEntry = () => {
    if (newMeasurementLabel.trim()) {
      const label = newMeasurementLabel.trim();
      if (!measurementEntries.some(e => e.label === label)) {
        setMeasurementEntries(prev => [
          ...prev,
          {
            id: Math.random().toString(36).substr(2, 9),
            label,
            value: "",
            isTemplateField: false
          }
        ]);
        setNewMeasurementLabel("");
      } else {
        showToast("Already Exists", "This measurement field is already in the ledger.", "error");
      }
    }
  };

  // Nothing is saved until the order is created, so any row can be corrected freely until then
  const handleClearEntry = (id: string) => {
    setMeasurementEntries(prev => prev.map(p => (p.id === id ? { ...p, value: "" } : p)));
  };

  // Template rows are the guided form and can only be cleared; extra rows can be removed outright
  const handleRemoveEntry = (id: string) => {
    const entry = measurementEntries.find(e => e.id === id);
    if (!entry || entry.isTemplateField) return;
    dismissedLabels.current.add(entry.label);
    setMeasurementEntries(prev => prev.filter(p => p.id !== id));
    if (activeEntryId === id) setActiveEntryId(null);
  };

  const handleSaveLabel = () => {
    if (!editingLabel) return;
    const label = editingLabel.draft.trim();
    const entry = measurementEntries.find(e => e.id === editingLabel.id);
    if (!entry || !label) {
      setEditingLabel(null);
      return;
    }
    if (measurementEntries.some(e => e.id !== entry.id && e.label.toLowerCase() === label.toLowerCase())) {
      showToast("Already Exists", "Another measurement already uses this name.", "error");
      return;
    }
    dismissedLabels.current.add(entry.label);
    setMeasurementEntries(prev => prev.map(p => (p.id === entry.id ? { ...p, label } : p)));
    setEditingLabel(null);
  };

  const handleCreateOrder = async () => {
    try {
      let finalCustomerId = selectedCustomer?.id;
      let finalCustomerName = selectedCustomer?.name;

      if (!finalCustomerId) {
        if (!newCustomer.name.trim()) throw new Error("Customer identification is required.");
        showToast("Creating new customer profile...", "Processing intake data.", "success");
        const c = await createCustomer.mutateAsync({
          name: newCustomer.name,
          email: newCustomer.email,
          phone: newCustomer.phone,
          notification_channel: newCustomer.notificationChannel,
        });
        finalCustomerId = c.id;
        finalCustomerName = c.name;
      }

      let finalMeasurementVersionId = autoSelectedMeasurement?.measurementId;

      if (!finalMeasurementVersionId) {
        // At least one measurement is required, unless the garment needs none (e.g. "General / Other")
        const numericMeasurements: Record<string, number> = {};
        measurementEntries.forEach(entry => {
          const val = parseFloat(entry.value);
          if (entry.label.trim() && !isNaN(val) && val > 0) {
            numericMeasurements[entry.label.trim()] = val;
          }
        });

        if (Object.keys(numericMeasurements).length === 0 && dynamicMeasurementFields.length > 0) {
          throw new Error("Validation Failed: At least one measurement metric is required to commit order.");
        }

        // Save and lock the measurements first; the order only points at the locked version
        showToast("Recording measurement snapshot...", "Saving draft measurement.", "success");
        const mv = await createMeasurement.mutateAsync({
          customerId: finalCustomerId,
          measurements: numericMeasurements,
        });

        if (!mv?.id) throw new Error("Critical: Measurement version ID not returned by system.");

        showToast("Locking measurement version...", "Sealing snapshot for production.", "success");
        const primaryTemplateId = orderItems[0]?.templateId;
        const locked = await measurementApi.completeMeasurement(mv.id, primaryTemplateId);

        if (!locked?.id) throw new Error("Critical: Measurement version could not be locked.");
        finalMeasurementVersionId = locked.id;
      }

      const finalStoreId = role === 'OWNER' ? chosenStoreId : userStoreId;
      if (!finalStoreId) {
        showToast("Store Assignment Required", "Store assignment is required. Please contact admin.", "error");
        return;
      }

      // Warn if the store is over capacity; this never blocks the order
      try {
        const capacityCheck = await storesApi.checkCapacity(finalStoreId, Math.max(orderItems.length, 1));
        if (!capacityCheck.allowed) {
          showToast(
            "Capacity Warning",
            `This order takes the store to ${capacityCheck.proposedTotal ?? '?'} of ${capacityCheck.maxCapacity ?? '?'} garments. Accepting it above the capacity limit.`,
          );
        }
      } catch {
        // If the capacity check itself fails, carry on with the order
      }

      showToast("Finalizing order & calculating risk...", "Almost there.", "success");
      const result = await ordersApi.createOrder({
        customerId: finalCustomerId,
        customerName: finalCustomerName.trim(),
        storeId: finalStoreId,
        // Midday local time, so the calendar date survives conversion to UTC
        eventDate: eventDate ? new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), 12).toISOString() : new Date().toISOString(),
        lockedMeasurementVersionId: finalMeasurementVersionId,
        // The server refuses an order that doesn't say where its fabric comes from
        fabric_source: ownFabric ? 'CUSTOMER' : 'STOCK',
        event_occasion: eventOccasion || undefined,
        garment_category: garmentCategory || undefined,
        garment_tier: garmentTier,
        payment_intent_type: paymentIntentType || undefined,
        garments: orderItems.map(g => ({
          workflowTemplateId: g.templateId,
          assignedTailorId: g.assignedTailorId || null,
          estimatedTotalDurationHours: g.estimatedTotalDurationHours || 24,
          fabricImageBase64: fabricDetails.fabricImageBase64,
          fabricType: fabricName || null,
          colorSwatch: fabricDetails.colorSwatch,
          designNotes: fabricDetails.designNotes,
          // The same quantity is saved on the garment and used for the material reservation
          quantity: Number(materialQuantity),
          quantityUnit
        })),
        materialId: stockMaterialId || undefined,
        materialQuantity: stockMaterialId ? Number(materialQuantity) : undefined,
        groupOrderId: groupId,
      });

      showToast("Order Intake Complete", "Your order has been committed to production.", "success");
      // So the new order is listed and searchable straight away
      queryClient.invalidateQueries({ queryKey: keys.orders.all });
      if (groupId) queryClient.invalidateQueries({ queryKey: ['groupOrders'] });
      queryClient.invalidateQueries({ queryKey: ['workflow', 'active-tasks'] });
      // The API returns { order, initialProjection }
      setSuccessOrder(result.order || result);
    } catch (err: any) {
      console.error("[Intake Engine Error]", err);
      const errorData = err.response?.data;
      let errorMessage = errorData?.message || err.message || "Failed to finalize order";

      // Turn the server's error code into a friendly message
      if (errorData?.code) {
        errorMessage = mapErrorCode(errorData.code);

        if (errorData.code === 'INSUFFICIENT_STOCK') {
          errorMessage = `Material Vault Error: ${errorMessage}`;
        }
      }

      showToast("Intake Error", errorMessage, "error");
    }
  };


  const steps: Step[] = ["CLIENT_SELECTION", "CLIENT_DETAILS", "GARMENTS_TIMELINE", "FABRIC_DETAILS", "MEASUREMENTS", "SUMMARY"];

  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: 'background.default',
      pt: 8,
      pb: 12,
      px: { xs: 2, md: 4 }
    }}>
      <Box className="container" sx={{ maxWidth: 900, mx: 'auto' }}>
        <header style={{ marginBottom: 40, textAlign: 'center' }}>
          <Typography variant="h3" sx={{ color: 'text.primary', fontWeight: 800, mb: 1, letterSpacing: '-0.02em' }}>
            Production Intake
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Precision order capture for the modern atelier.
          </Typography>
        </header>

        {group && (
          <Alert severity="info" sx={{ mb: 4, borderRadius: '12px' }}>
            This order joins the group <strong>{group.name}</strong>
            {group.leadTailorName ? `; unassigned garments go to ${group.leadTailorName}` : ''}.
          </Alert>
        )}

        {/* STEP INDICATOR */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          mb: 6,
          position: 'relative',
          px: 4
        }}>
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: 0,
            width: '100%',
            height: '2px',
            bgcolor: 'divider',
            mt: '-1px',
            zIndex: 0
          }} />
          {steps.filter(s => s !== "CLIENT_DETAILS" || !selectedCustomer).map((s, idx) => (
            <Box
              key={s}
              sx={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 14,
                zIndex: 1,
                transition: 'all 0.3s ease',
                bgcolor: step === s ? 'secondary.main' : (steps.indexOf(step) > steps.indexOf(s) ? 'primary.main' : 'background.paper'),
                color: step === s || steps.indexOf(step) > steps.indexOf(s) ? 'white' : 'text.secondary',
                border: steps.indexOf(step) <= steps.indexOf(s) && step !== s ? '2px solid' : 'none',
                borderColor: 'divider',
                boxShadow: step === s ? `0 0 15px ${alpha('#c49a1a', 0.3)}` : 'none',
                transform: step === s ? 'scale(1.1)' : 'scale(1)'
              }}
            >
              {idx + 1}
            </Box>
          ))}
        </Box>

        <Card sx={{
          borderRadius: '24px',
          p: { xs: 3, md: 6 },
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.05)',
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider'
        }}>

          {/* STEP 0: CLIENT SELECTION */}
          {step === "CLIENT_SELECTION" && (
            <Box className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Typography variant="h5" sx={{ mb: 4, fontWeight: 700, color: 'text.primary' }}>1. Perimeter: Client Identification</Typography>
              <Stack spacing={4}>
                <Box sx={{ position: 'relative' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', mb: 1, display: 'block' }}>
                    Search Infrastructure
                  </Typography>
                  {isPreloadingProfile ? (
                    <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, bgcolor: 'background.default', borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
                      <CircularProgress size={32} color="secondary" />
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>Synthesizing client context...</Typography>
                    </Box>
                  ) : (
                    <Autocomplete
                      options={searchResults || []}
                      getOptionLabel={(option: any) => `${option.name} (${option.phone || option.email || 'N/A'})`}
                      loading={isSearching}
                      onInputChange={(_, value) => setSearchQuery(value)}
                      onChange={(_, value) => {
                        if (value) {
                          setSelectedCustomer(value);
                          setStep("GARMENTS_TIMELINE");
                        }
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="Search existing clients..."
                          variant="outlined"
                          fullWidth
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              height: 64,
                              bgcolor: 'background.default',
                              borderRadius: '12px',
                              '& fieldset': { borderColor: 'divider' },
                              '&:hover fieldset': { borderColor: 'primary.main' },
                              '&.Mui-focused fieldset': { borderColor: 'secondary.main' },
                            },
                          }}
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
                            endAdornment: (
                              <>
                                {isSearching ? <CircularProgress color="inherit" size={20} /> : null}
                                {params.InputProps.endAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                    />
                  )}
                </Box>

                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>OR</Typography>
                  <Button
                    variant="outlined"
                    fullWidth
                    size="large"
                    startIcon={<AddIcon />}
                    onClick={() => setStep("CLIENT_DETAILS")}
                    sx={{
                      height: 64,
                      borderRadius: '12px',
                      borderColor: 'divider',
                      color: 'primary.main',
                      fontSize: 16,
                      fontWeight: 600,
                      textTransform: 'none',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: alpha('#1e5c3a', 0.04)
                      }
                    }}
                  >
                    Add New Client Profile
                  </Button>
                </Box>
              </Stack>
            </Box>
          )}

          {/* STEP 1: CLIENT DETAILS (NEW CLIENT ONLY) */}
          {step === "CLIENT_DETAILS" && (
            <Box className="animate-in fade-in slide-in-from-right-4 duration-500">
              <Box sx={{ mb: 4 }}>
                <Typography
                  variant="h3"
                  className="mobile-page-title md:text-h2"
                  sx={{
                    fontSize: { xs: '1.75rem', md: 'clamp(1.5rem, 4vw, 2.25rem)' },
                    fontWeight: 800,
                    lineHeight: 1.2,
                    letterSpacing: '-0.02em',
                    mb: 1
                  }}
                >
                  Identify Boutique
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', display: { xs: 'block', md: 'none' } }}>
                  Contact details for production enrollment
                </Typography>
                <Typography
                  variant="h5"
                  sx={{ mb: 4, fontWeight: 700, color: 'text.primary', display: { xs: 'none', md: 'block' } }}
                >
                  1. Identifying Primary Boutique
                </Typography>
              </Box>

              <Card sx={{
                borderRadius: '24px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
                border: '1px solid',
                borderColor: 'divider',
                overflow: 'hidden'
              }}>
                <Stack divider={<Divider />}>
                  <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: alpha('#c49a1a', 0.1), color: 'secondary.main' }}>
                      <PersonIcon />
                    </Avatar>
                    <TextField
                      fullWidth
                      variant="standard"
                      label="Full Name"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                      InputProps={{ disableUnderline: true, sx: { fontSize: '1rem', fontWeight: 600 } }}
                      sx={{ '& .MuiInputLabel-root': { fontSize: '0.875rem' } }}
                    />
                  </Box>
                  <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: alpha('#c49a1a', 0.1), color: 'secondary.main' }}>
                      <EmailIcon />
                    </Avatar>
                    <TextField
                      fullWidth
                      variant="standard"
                      label="Email Address"
                      type="email"
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                      InputProps={{ disableUnderline: true, sx: { fontSize: '1rem', fontWeight: 600 } }}
                      sx={{ '& .MuiInputLabel-root': { fontSize: '0.875rem' } }}
                    />
                  </Box>
                  <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: alpha('#c49a1a', 0.1), color: 'secondary.main' }}>
                      <PhoneIcon />
                    </Avatar>
                    <TextField
                      fullWidth
                      variant="standard"
                      label="Phone Number"
                      type="tel"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                      InputProps={{ disableUnderline: true, sx: { fontSize: '1rem', fontWeight: 600 } }}
                      sx={{ '& .MuiInputLabel-root': { fontSize: '0.875rem' } }}
                    />
                  </Box>
                  <Box sx={{ p: 2.5 }}>
                    <FormControl component="fieldset">
                      <FormLabel component="legend" sx={{ fontSize: '0.875rem', fontWeight: 700, color: 'text.secondary', mb: 1 }}>
                        Preferred Notification Channel
                      </FormLabel>
                      <RadioGroup
                        row
                        value={newCustomer.notificationChannel}
                        onChange={(e) => setNewCustomer({ ...newCustomer, notificationChannel: e.target.value as "whatsapp" | "sms" | "email" })}
                      >
                        <FormControlLabel value="whatsapp" control={<Radio size="small" color="primary" />} label={<Typography variant="body2" sx={{ fontWeight: 600 }}>WhatsApp (recommended)</Typography>} />
                        <FormControlLabel value="sms" control={<Radio size="small" color="primary" />} label={<Typography variant="body2" sx={{ fontWeight: 600 }}>SMS</Typography>} />
                        <FormControlLabel value="email" control={<Radio size="small" color="primary" />} label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Email</Typography>} />
                      </RadioGroup>
                    </FormControl>
                  </Box>
                </Stack>
              </Card>

              <Divider sx={{ my: 4 }} />

              <Stack
                direction="row"
                spacing={2}
                justifyContent="space-between"
                sx={{
                  pt: 8,
                  position: { xs: 'fixed', md: 'static' },
                  bottom: { xs: 'calc(64px + env(safe-area-inset-bottom, 0px))', md: 0 },
                  left: 0,
                  right: 0,
                  bgcolor: 'background.paper',
                  p: { xs: 2, md: 0 },
                  borderTop: { xs: '1px solid', md: 'none' },
                  borderColor: 'divider',
                  zIndex: 10,
                  pb: { xs: 'calc(16px + env(safe-area-inset-bottom, 16px))', md: 0 }
                }}
              >
                <Button onClick={() => setStep("CLIENT_SELECTION")} sx={{ color: 'text.primary' }}>Back</Button>
                <Button
                  variant="contained"
                  disabled={!selectedCustomer && !newCustomer.name}
                  onClick={() => setStep("GARMENTS_TIMELINE")}
                  sx={{ bgcolor: 'secondary.main', height: 52, px: 6, borderRadius: '12px', '&:hover': { bgcolor: '#d4aa2a' } }}
                >
                  Proceed to Items
                </Button>
              </Stack>
            </Box>
          )}

          {/* STEP 2: GARMENT & TIMELINE */}
          {step === "GARMENTS_TIMELINE" && (
            <Box className="animate-in fade-in slide-in-from-right-4 duration-500">
              <Box sx={{ mb: 4 }}>
                <Typography
                  variant="h3"
                  className="mobile-page-title md:text-h2"
                  sx={{
                    fontSize: { xs: '1.75rem', md: 'clamp(1.5rem, 4vw, 2.25rem)' },
                    fontWeight: 800,
                    lineHeight: 1.2,
                    letterSpacing: '-0.02em',
                    mb: 1
                  }}
                >
                  Production Blueprint
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', display: { xs: 'block', md: 'none' } }}>
                  Defining items and deadlines
                </Typography>
                <Typography
                  variant="h5"
                  sx={{ mb: 4, fontWeight: 700, color: 'text.primary', display: { xs: 'none', md: 'block' } }}
                >
                  2. Defining Production Blueprint
                </Typography>
              </Box>

              <Grid container spacing={4}>
                <Grid size={{ xs: 12, md: 7 }}>
                  <Typography variant="overline" sx={{ color: 'text.disabled', fontWeight: 800, mb: 1.5, display: 'block', letterSpacing: 1.5 }}>
                    SELECT GARMENT TYPES
                  </Typography>
                  <Grid container spacing={2}>
                    {templates?.map((template) => {
                      const isGeneral = !template.companyId;
                      const displayName = isGeneral ? "General / Other" : template.name;
                      const subtitle = isGeneral ? "For garments without a specific production template." : "";

                      return (
                        <Grid size={{ xs: 6, sm: 4 }} key={template.id}>
                          <Card
                            onClick={() => handleTemplateSelection(template)}
                            sx={{
                              bgcolor: 'background.paper',
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: '20px',
                              p: 2,
                              textAlign: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                              minHeight: 140,
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                              '&:hover': {
                                bgcolor: alpha('#1e5c3a', 0.04),
                                transform: 'translateY(-4px)',
                                borderColor: 'secondary.main',
                                boxShadow: `0 12px 24px ${alpha('#c49a1a', 0.15)}`
                              },
                              '&:active': { transform: 'scale(0.96)' }
                            }}
                          >
                            <Box sx={{ color: 'secondary.main', mb: isGeneral ? 0.5 : 1.5 }}>
                              {isGeneral ? <CategoryIcon sx={{ fontSize: 40 }} /> : getGarmentIconLarge(template.name)}
                            </Box>
                            <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 700, lineHeight: 1.2 }}>{displayName}</Typography>
                            {subtitle && (
                              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '10px', mt: 0.5, lineHeight: 1.1 }}>
                                {subtitle}
                              </Typography>
                            )}
                          </Card>
                        </Grid>
                      );
                    })}
                    {(!templates || templates.length === 0) && (
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="body2" sx={{ color: 'text.disabled', p: 4, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: '12px' }}>
                          No production templates found. Configure them in Dashboard Settings.
                        </Typography>
                      </Grid>
                    )}
                  </Grid>

                  <Box sx={{ mt: 6 }}>
                    <Typography variant="overline" sx={{ color: 'text.disabled', fontWeight: 800, mb: 1.5, display: 'block', letterSpacing: 1.5 }}>
                      ORDER ITEMS LEDGER
                    </Typography>

                    <Card sx={{ borderRadius: '24px', boxShadow: 'none', border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                      <List sx={{ p: 0 }}>
                        {orderItems.map((g, idx) => {
                          const template = templates?.find(t => t.id === g.templateId);
                          const assignedTailor = staff?.find(s => s.id === g.assignedTailorId);

                          return (
                            <Box key={idx}>
                              <ListItem
                                sx={{
                                  p: { xs: 2, sm: 3 },
                                  display: 'flex',
                                  flexDirection: { xs: 'column', sm: 'row' },
                                  alignItems: { xs: 'stretch', sm: 'center' },
                                  gap: 2
                                }}
                              >
                                <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, gap: 2 }}>
                                  <ListItemAvatar>
                                    <Avatar sx={{ bgcolor: alpha('#c49a1a', 0.1), color: 'secondary.main', borderRadius: '12px', width: 48, height: 48 }}>
                                      {getGarmentIcon(template?.name || '')}
                                    </Avatar>
                                  </ListItemAvatar>
                                  <ListItemText
                                    primary={<Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{template?.name}</Typography>}
                                    secondary={<Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>24H DURATION ESTIMATE</Typography>}
                                  />
                                </Box>

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                  {/* Mobile: Drawer Trigger Button | Desktop: Standard Select */}
                                  <Box sx={{ display: { xs: 'block', sm: 'none' }, width: '100%' }}>
                                    <Button
                                      fullWidth
                                      variant="outlined"
                                      onClick={() => {
                                        setItemIndexForAssignment(idx);
                                        setIsTailorDrawerOpen(true);
                                      }}
                                      sx={{
                                        borderRadius: '12px',
                                        height: 44,
                                        justifyContent: 'space-between',
                                        px: 2,
                                        borderColor: alpha('#000', 0.1),
                                        color: assignedTailor ? 'text.primary' : 'text.secondary',
                                        fontWeight: assignedTailor ? 700 : 500,
                                        textTransform: 'none'
                                      }}
                                      endIcon={<ChevronRightIcon sx={{ color: 'text.disabled' }} />}
                                    >
                                      {assignedTailor ? (
                                        <Stack direction="row" spacing={1} alignItems="center">
                                          <Avatar sx={{ width: 24, height: 24, fontSize: 10, bgcolor: 'primary.main' }}>
                                            {assignedTailor.email[0].toUpperCase()}
                                          </Avatar>
                                          <Typography variant="body2">{assignedTailor.email.split('@')[0]}</Typography>
                                        </Stack>
                                      ) : (
                                        "Assign Tailor"
                                      )}
                                    </Button>
                                  </Box>

                                  <Box sx={{ display: { xs: 'none', sm: 'block' }, minWidth: 160 }}>
                                    <FormControl size="small" fullWidth>
                                      <Select
                                        value={g.assignedTailorId || ""}
                                        displayEmpty
                                        onChange={(e) => {
                                          const next = [...orderItems];
                                          next[idx].assignedTailorId = e.target.value;
                                          setOrderItems(next);
                                        }}
                                        sx={{ borderRadius: '10px', height: 40 }}
                                      >
                                        <MenuItem value=""><em>Unassigned</em></MenuItem>
                                        {staff?.filter(s => s.role === 'TAILOR').map(s => (
                                          <MenuItem key={s.id} value={s.id}>{s.email.split('@')[0]}</MenuItem>
                                        ))}
                                      </Select>
                                    </FormControl>
                                  </Box>

                                  <IconButton
                                    size="small"
                                    onClick={() => setOrderItems(orderItems.filter((_, i) => i !== idx))}
                                    sx={{
                                      bgcolor: alpha('#d32f2f', 0.05),
                                      color: 'error.main',
                                      '&:hover': { bgcolor: alpha('#d32f2f', 0.1) }
                                    }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Box>
                              </ListItem>
                              {idx < orderItems.length - 1 && <Divider sx={{ mx: 2 }} />}
                            </Box>
                          );
                        })}
                        {orderItems.length === 0 && (
                          <Box sx={{ p: 6, textAlign: 'center' }}>
                            <Box sx={{ color: 'text.disabled', opacity: 0.2, mb: 1 }}>
                              <CategoryIcon sx={{ fontSize: 48 }} />
                            </Box>
                            <Typography variant="body2" sx={{ color: 'text.disabled', fontWeight: 600 }}>
                              No items selected for production yet.
                            </Typography>
                          </Box>
                        )}
                      </List>
                    </Card>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, md: 5 }}>
                  <Typography variant="overline" sx={{ color: 'text.disabled', fontWeight: 800, mb: 1.5, display: 'block', letterSpacing: 1.5 }}>
                    PRODUCTION DEADLINE
                  </Typography>
                  <Box sx={{
                    bgcolor: 'background.paper',
                    borderRadius: '24px',
                    p: { xs: 0, sm: 1 },
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
                    overflow: 'hidden',
                    display: 'flex',
                    justifyContent: 'center'
                  }}>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <DateCalendar
                        value={eventDate}
                        onChange={(newValue) => setEventDate(newValue)}
                        disablePast
                        sx={{
                          width: '100%',
                          maxWidth: '320px',
                          '& .MuiDayCalendar-header': { justifyContent: 'space-around' },
                          '& .MuiDayCalendar-weekContainer': { justifyContent: 'space-around' },
                          '& .MuiDayCalendar-monthContainer': { width: '100%' }
                        }}
                      />
                    </LocalizationProvider>
                  </Box>
                  <Box sx={{ mt: 2, p: 2, bgcolor: alpha('#c49a1a', 0.05), borderRadius: '10px', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <EventIcon sx={{ color: 'secondary.main', fontSize: 20 }} />
                    <Typography variant="caption" sx={{ color: 'secondary.main', fontWeight: 600, textTransform: 'uppercase' }}>
                      {eventDate ? `Selected: ${eventDate.toLocaleDateString()}` : 'Pick a deadline for risk projection'}
                    </Typography>
                  </Box>

                  {role === 'OWNER' && !isStoreManager && !isTailor && (
                    <Box sx={{ mt: 4 }}>
                      <Typography variant="overline" sx={{ color: 'text.disabled', fontWeight: 800, mb: 1.5, display: 'block', letterSpacing: 1.5 }}>
                        STORE ASSIGNMENT
                      </Typography>
                      <FormControl fullWidth>
                        <InputLabel id="order-store-label">Production Store</InputLabel>
                        <Select
                          labelId="order-store-label"
                          value={chosenStoreId}
                          label="Production Store"
                          onChange={(e) => setSelectedStoreId(e.target.value)}
                          disabled={!!groupStoreId}
                          sx={{ borderRadius: '12px', bgcolor: 'background.default' }}
                        >
                          {stores?.map(store => (
                            <MenuItem key={store.id} value={store.id}>{store.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                  )}
                </Grid>
              </Grid>

              {/* ORDER CLASSIFICATION */}
              <Box sx={{ mt: 5 }}>
                <Typography variant="overline" sx={{ color: 'text.disabled', fontWeight: 800, mb: 1.5, display: 'block', letterSpacing: 1.5 }}>
                  ORDER CLASSIFICATION
                </Typography>
                <Card sx={{ borderRadius: '24px', boxShadow: 'none', border: '1px solid', borderColor: 'divider', p: 3 }}>
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FormControl fullWidth required>
                        <InputLabel id="order-occasion-label">Occasion</InputLabel>
                        <Select
                          labelId="order-occasion-label"
                          value={eventOccasion}
                          label="Occasion"
                          onChange={(e) => setEventOccasion(e.target.value)}
                          sx={{ borderRadius: '12px', bgcolor: 'background.default' }}
                        >
                          {[
                            ['wedding', 'Wedding'],
                            ['burial', 'Burial'],
                            ['owambe', 'Owambe'],
                            ['graduation', 'Graduation'],
                            ['corporate', 'Corporate'],
                            ['naming_ceremony', 'Naming Ceremony'],
                            ['engagement', 'Engagement'],
                            ['birthday', 'Birthday'],
                            ['religious', 'Religious'],
                            ['convocation', 'Convocation'],
                            ['other', 'Other'],
                          ].map(([value, label]) => (
                            <MenuItem key={value} value={value}>{label}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FormControl fullWidth required>
                        <InputLabel id="order-category-label">Garment Category</InputLabel>
                        <Select
                          labelId="order-category-label"
                          value={garmentCategory}
                          label="Garment Category"
                          onChange={(e) => setGarmentCategory(e.target.value)}
                          sx={{ borderRadius: '12px', bgcolor: 'background.default' }}
                        >
                          {[
                            ['agbada_set', 'Agbada Set'],
                            ['native_senator', 'Native Senator'],
                            ['ankara_gown', 'Ankara Gown'],
                            ['kaftan', 'Kaftan'],
                            ['suit', 'Suit'],
                            ['corporate_dress', 'Corporate Dress'],
                            ['lace_gown', 'Lace Gown'],
                            ['aso_oke_set', 'Aso-Oke Set'],
                            ['skirt_and_blouse', 'Skirt & Blouse'],
                            ['jumpsuit', 'Jumpsuit'],
                            ['childrens_wear', "Children's Wear"],
                            ['other', 'Other'],
                          ].map(([value, label]) => (
                            <MenuItem key={value} value={value}>{label}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FormControl fullWidth required>
                        <InputLabel id="order-payment-label">Payment Structure</InputLabel>
                        <Select
                          labelId="order-payment-label"
                          value={paymentIntentType}
                          label="Payment Structure"
                          onChange={(e) => setPaymentIntentType(e.target.value)}
                          sx={{ borderRadius: '12px', bgcolor: 'background.default' }}
                        >
                          {[
                            ['deposit_then_balance', 'Deposit then Balance'],
                            ['full_upfront', 'Full Upfront'],
                            ['installments', 'Installments'],
                            ['on_collection', 'On Collection'],
                          ].map(([value, label]) => (
                            <MenuItem key={value} value={value}>{label}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                      <FormControl component="fieldset" fullWidth>
                        <FormLabel component="legend" sx={{ fontSize: '0.75rem', fontWeight: 800, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 1, mb: 1.5 }}>
                          Construction Tier
                        </FormLabel>
                        <RadioGroup
                          row
                          value={garmentTier}
                          onChange={(e) => setGarmentTier(e.target.value as "STANDARD" | "COMPLEX" | "BESPOKE")}
                          sx={{ gap: 1 }}
                        >
                          {([
                            ['STANDARD', 'Standard', 'Straightforward construction, fixed design'],
                            ['COMPLEX', 'Complex', 'Multi-piece or detailed construction'],
                            ['BESPOKE', 'Bespoke', 'Fully custom. Requires fitting appointments.'],
                          ] as const).map(([value, label, description]) => (
                            <Box
                              key={value}
                              onClick={() => setGarmentTier(value)}
                              sx={{
                                flex: 1,
                                minWidth: 140,
                                p: 1.5,
                                borderRadius: '12px',
                                border: '1px solid',
                                borderColor: garmentTier === value ? 'primary.main' : 'divider',
                                bgcolor: garmentTier === value ? alpha('#1e5c3a', 0.04) : 'background.paper',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                '&:hover': { borderColor: 'primary.light', bgcolor: alpha('#1e5c3a', 0.02) },
                              }}
                            >
                              <FormControlLabel
                                value={value}
                                control={<Radio size="small" color="primary" sx={{ p: 0.5 }} />}
                                label={
                                  <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{label}</Typography>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.3, display: 'block', mt: 0.25 }}>{description}</Typography>
                                  </Box>
                                }
                                sx={{ m: 0, alignItems: 'flex-start', gap: 0.5 }}
                              />
                            </Box>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      {garmentTier === 'BESPOKE' && (
                        <Alert
                          severity="info"
                          sx={{ mt: 2, borderRadius: '10px', border: '1px solid', borderColor: 'info.light' }}
                        >
                          Bespoke orders require fitting appointments before the finishing stage.
                        </Alert>
                      )}
                    </Grid>
                  </Grid>
                </Card>
              </Box>

              <Divider sx={{ my: 4 }} />

              <Stack
                direction="row"
                spacing={2}
                justifyContent="space-between"
                sx={{
                  pt: 8,
                  position: { xs: 'fixed', md: 'static' },
                  bottom: { xs: 'calc(64px + env(safe-area-inset-bottom, 0px))', md: 0 },
                  left: 0,
                  right: 0,
                  bgcolor: 'background.paper',
                  p: { xs: 2.5, md: 0 },
                  borderTop: { xs: '1px solid', md: 'none' },
                  borderColor: 'divider',
                  zIndex: 10,
                  pb: { xs: 'calc(16px + env(safe-area-inset-bottom, 16px))', md: 0 }
                }}
              >
                <Button
                  onClick={() => setStep(selectedCustomer ? "CLIENT_SELECTION" : "CLIENT_DETAILS")}
                  sx={{ color: 'text.secondary', fontWeight: 600 }}
                >
                  Back
                </Button>
                <Button
                  variant="contained"
                  disabled={orderItems.length === 0 || !eventDate || !eventOccasion || !garmentCategory || !paymentIntentType}
                  onClick={() => setStep("FABRIC_DETAILS")}
                  sx={{
                    bgcolor: 'secondary.main',
                    height: 52,
                    px: 6,
                    borderRadius: '12px',
                    fontWeight: 700,
                    '&:hover': { bgcolor: '#d4aa2a' },
                    '&.Mui-disabled': { bgcolor: alpha('#c49a1a', 0.3) }
                  }}
                >
                  Configure Material
                </Button>
              </Stack>


              {/* MOBILE TAILOR PICKER DRAWER */}
              <SwipeableDrawer
                anchor="bottom"
                open={isTailorDrawerOpen}
                onClose={() => setIsTailorDrawerOpen(false)}
                onOpen={() => setIsTailorDrawerOpen(true)}
                PaperProps={{
                  sx: {
                    borderTopLeftRadius: '24px',
                    borderTopRightRadius: '24px',
                    maxHeight: '70vh',
                    bgcolor: 'background.paper'
                  }
                }}
              >
                <Box sx={{ p: 2, pb: 6 }}>
                  <Box sx={{ width: 40, height: 4, bgcolor: 'divider', borderRadius: 2, mx: 'auto', mb: 3 }} />
                  <Typography variant="h6" sx={{ fontWeight: 800, px: 2, mb: 2 }}>Assign Tailor</Typography>
                  <Typography variant="body2" sx={{ px: 2, mb: 3, color: 'text.secondary' }}>
                    Select a specialist for this garment.
                  </Typography>
                  <List>
                    <ListItem disablePadding>
                      <ListItemButton
                        onClick={() => {
                          if (itemIndexForAssignment !== null) {
                            const next = [...orderItems];
                            next[itemIndexForAssignment].assignedTailorId = null;
                            setOrderItems(next);
                          }
                          setIsTailorDrawerOpen(false);
                        }}
                        sx={{ borderRadius: '12px', mb: 1 }}
                      >
                        <ListItemIcon><PersonIcon color="disabled" /></ListItemIcon>
                        <ListItemText primary="Unassigned" />
                      </ListItemButton>
                    </ListItem>
                    {staff?.filter(s => s.role === 'TAILOR').map((s) => (
                      <ListItem key={s.id} disablePadding>
                        <ListItemButton
                          onClick={() => {
                            if (itemIndexForAssignment !== null) {
                              const next = [...orderItems];
                              next[itemIndexForAssignment].assignedTailorId = s.id;
                              setOrderItems(next);
                            }
                            setIsTailorDrawerOpen(false);
                          }}
                          sx={{
                            borderRadius: '12px',
                            mb: 1,
                            bgcolor: itemIndexForAssignment !== null && orderItems[itemIndexForAssignment].assignedTailorId === s.id ? alpha('#1e5c3a', 0.05) : 'transparent',
                            '&:hover': { bgcolor: alpha('#1e5c3a', 0.08) }
                          }}
                        >
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: 'primary.main', fontWeight: 800 }}>
                              {s.email[0].toUpperCase()}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={<Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{s.fullName || s.email.split('@')[0]}</Typography>}
                            secondary={s.email}
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </SwipeableDrawer>
            </Box>
          )}

          {/* STEP 3: FABRIC & DESIGN */}
          {step === "FABRIC_DETAILS" && (
            <Box className="animate-in fade-in slide-in-from-right-4 duration-500">
              <Box sx={{ mb: 4 }}>
                <Typography
                  variant="h3"
                  className="mobile-page-title md:text-h2"
                  sx={{
                    fontSize: { xs: '1.75rem', md: 'clamp(1.5rem, 4vw, 2.25rem)' },
                    fontWeight: 800,
                    lineHeight: 1.2,
                    letterSpacing: '-0.02em',
                    mb: 1
                  }}
                >
                  Material Config
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', display: { xs: 'block', md: 'none' } }}>
                  The evidence: Fabric and composition
                </Typography>
                <Typography
                  variant="h5"
                  sx={{ mb: 4, fontWeight: 700, color: 'text.primary', display: { xs: 'none', md: 'block' } }}
                >
                  3. The Evidence: Fabric & Design
                </Typography>
              </Box>

              <Grid container spacing={4}>
                {/* Information only: fabric photos are taken per garment on the order page after the order exists. */}
                <Grid size={{ xs: 12, md: 5 }}>
                  <Typography variant="overline" sx={{ color: 'text.disabled', fontWeight: 800, mb: 1.5, display: 'block', letterSpacing: 1.5 }}>
                    FABRIC EVIDENCE
                  </Typography>
                  <Card
                    sx={{
                      width: '100%',
                      minHeight: 240,
                      border: '2px dashed',
                      borderColor: 'divider',
                      borderRadius: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'background.paper',
                      boxShadow: 'none',
                      p: 3,
                      textAlign: 'center',
                    }}
                  >
                    <Stack spacing={1} alignItems="center">
                      <Avatar sx={{ bgcolor: alpha('#c49a1a', 0.1), color: 'secondary.main', width: 64, height: 64, mb: 1 }}>
                        <AddIcon sx={{ fontSize: 32 }} />
                      </Avatar>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Capture Fabric Photo After Saving
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                        Each garment gets its own fabric photo, captured with the
                        camera on the order&apos;s detail page once this order is saved.
                      </Typography>
                    </Stack>
                  </Card>
                </Grid>

                {/* Fabric Type & Swatch */}
                <Grid size={{ xs: 12, md: 7 }}>
                  <Typography variant="overline" sx={{ color: 'text.disabled', fontWeight: 800, mb: 1.5, display: 'block', letterSpacing: 1.5 }}>
                    SPECIFICATIONS
                  </Typography>

                  <Card sx={{
                    borderRadius: '24px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
                    border: '1px solid',
                    borderColor: 'divider',
                    mb: 3,
                    p: 3
                  }}>
                    <Stack spacing={3}>
                      {/* No materials registered yet */}
                      {inventory !== undefined && inventory.length === 0 && (
                        <Box sx={{
                          p: 2,
                          bgcolor: alpha('#f59e0b', 0.1),
                          border: '1px solid',
                          borderColor: alpha('#f59e0b', 0.5),
                          borderRadius: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2
                        }}>
                          <Typography variant="body2" sx={{ color: '#92400e', fontWeight: 600 }}>
                            <WarningIcon sx={{ fontSize: 16, verticalAlign: '-3px', mr: 0.5 }} aria-hidden />No materials in stock yet. Choose "Customer's own fabric", or register one under Inventory.
                          </Typography>
                        </Box>
                      )}

                      {/* Material takes its own row; quantity and unit share the next, so neither gets squeezed in the half-width column */}
                      <Stack direction="row" flexWrap="wrap" useFlexGap spacing={2}>
                        <FormControl fullWidth sx={{ flexBasis: '100%' }}>
                          <InputLabel id="order-material-label">Material Base</InputLabel>
                          <Select
                            labelId="order-material-label"
                            value={selectedMaterialId}
                            label="Material Base"
                            onChange={(e) => setSelectedMaterialId(e.target.value)}
                            sx={{ borderRadius: '12px', bgcolor: 'background.default' }}
                            error={inventory !== undefined && inventory.length === 0}
                          >
                            <MenuItem value=""><em>-- Select Material --</em></MenuItem>
                            <MenuItem value={OWN_FABRIC}>{OWN_FABRIC_LABEL} (not from stock)</MenuItem>
                            {inventory?.map((m: any, idx: number) => (
                              <MenuItem key={`${m.materialId}-${idx}`} value={m.materialId} disabled={m.quantityAvailable <= 0}>
                                {m.name} ({m.quantityAvailable} {m.unit} left)
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>

                        <TextField
                          sx={{ flex: '1 1 140px', '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                          label="Qty / Yardage"
                          value={materialQuantity}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9.]/g, '');
                            if ((val.match(/\./g) || []).length <= 1) setMaterialQuantity(val === "" ? "" : val as any);
                          }}
                          inputProps={{ inputMode: 'decimal', pattern: '[0-9]*\\.?[0-9]*' }}
                          disabled={!selectedMaterialId}
                        />
                        <FormControl sx={{ flex: '1 1 120px' }} disabled={!selectedMaterialId}>
                          <InputLabel id="order-unit-label">Unit</InputLabel>
                          <Select
                            labelId="order-unit-label"
                            value={quantityUnit}
                            label="Unit"
                            onChange={(e) => setQuantityUnit(e.target.value as "yards" | "meters")}
                            sx={{ borderRadius: '12px', bgcolor: 'background.default' }}
                          >
                            <MenuItem value="yards">Yards</MenuItem>
                            <MenuItem value="meters">Meters</MenuItem>
                          </Select>
                        </FormControl>
                      </Stack>

                      <Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', mb: 1.5, display: 'block' }}>
                          Color Swatch
                        </Typography>
                        <Stack direction="row" spacing={1.5} flexWrap="wrap">
                          {['#0F172A', '#475569', '#1E293B', '#FFFFFF', '#0EA5E9', '#7F1D1D', '#064E3B', '#C49A1A'].map(color => (
                            <Box
                              key={color}
                              onClick={() => setFabricDetails({ ...fabricDetails, colorSwatch: color })}
                              sx={{
                                width: 44,
                                height: 44,
                                borderRadius: '12px',
                                bgcolor: color,
                                cursor: 'pointer',
                                position: 'relative',
                                border: '2px solid',
                                borderColor: fabricDetails.colorSwatch === color ? 'secondary.main' : (color === '#FFFFFF' ? 'divider' : 'transparent'),
                                transition: 'all 0.2s',
                                '&:hover': { transform: 'scale(1.1)' },
                                '&::after': fabricDetails.colorSwatch === color ? {
                                  content: '""',
                                  position: 'absolute',
                                  inset: -4,
                                  borderRadius: '14px',
                                  border: `2px solid ${alpha('#c49a1a', 0.5)}`
                                } : {}
                              }}
                            />
                          ))}
                        </Stack>
                      </Box>

                      <TextField
                        fullWidth
                        label="Design Notes"
                        multiline
                        rows={4}
                        value={fabricDetails.designNotes}
                        onChange={(e) => setFabricDetails({ ...fabricDetails, designNotes: e.target.value })}
                        placeholder="Special lining, unique buttons, or specific stitching requests..."
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '16px', bgcolor: 'background.default' } }}
                      />
                    </Stack>
                  </Card>
                </Grid>
              </Grid>

            {autoSelectedMeasurement && (
              <Box sx={{
                p: 2,
                mb: 3,
                bgcolor: alpha('#1e5c3a', 0.05),
                borderRadius: '12px',
                border: '1px solid',
                borderColor: alpha('#1e5c3a', 0.2),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <IntelIcon sx={{ color: 'primary.main' }} />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Using complete measurements from {safeLocaleDate(new Date(autoSelectedMeasurement.takenAt))}
                  </Typography>
                </Stack>
                <Button
                  size="small"
                  onClick={() => {
                    setAutoSelectedMeasurement(null);
                    showToast("Intelligence Cleared", "System will now capture fresh measurements.", "success");
                  }}
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                  Change
                </Button>
              </Box>
            )}

            <Divider sx={{ my: 4 }} />

            <Stack
              direction="row"
              spacing={2}
              justifyContent="space-between"
              sx={{
                pt: 8,
                position: { xs: 'fixed', md: 'static' },
                bottom: { xs: 'calc(64px + env(safe-area-inset-bottom, 0px))', md: 0 },
                left: 0,
                right: 0,
                bgcolor: 'background.paper',
                p: { xs: 2, md: 0 },
                borderTop: { xs: '1px solid', md: 'none' },
                borderColor: 'divider',
                zIndex: 10,
                pb: { xs: 'calc(16px + env(safe-area-inset-bottom, 16px))', md: 0 }
              }}
            >
              <Button onClick={() => setStep("GARMENTS_TIMELINE")} sx={{ color: 'text.primary' }}>Back</Button>
              <Button
                variant="contained"
                // Both sources need the fabric quantity: the customer confirms it before production starts
                disabled={!selectedMaterialId || !materialQuantity}
                onClick={goToMeasurementsOrSummary}
                sx={{ bgcolor: 'secondary.main', height: 52, px: 6, borderRadius: '12px', '&:hover': { bgcolor: '#d4aa2a' } }}
              >
                {autoSelectedMeasurement ? "Proceed to Review" : "Capture Measurements"}
              </Button>
            </Stack>
          </Box>
        )}
          {step === "MEASUREMENTS" && (
            <Box className="animate-in fade-in slide-in-from-right-4 duration-500">
              <Box sx={{ mb: 4 }}>
                <Typography
                   variant="h3"
                   className="mobile-page-title md:text-h2"
                   sx={{
                     fontSize: { xs: '1.75rem', md: 'clamp(1.5rem, 4vw, 2.25rem)' },
                     fontWeight: 800,
                     lineHeight: 1.2,
                     letterSpacing: '-0.02em',
                     mb: 1
                   }}
                >
                  Measurements
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', display: { xs: 'block', md: 'none' } }}>
                  Recording primary metrics in centimeters
                </Typography>
                <Typography
                  variant="h5"
                  sx={{ mb: 4, fontWeight: 700, color: 'text.primary', display: { xs: 'none', md: 'block' } }}
                >
                  4. Recording Measurements (cm)
                </Typography>
              </Box>

              <Grid container spacing={3}>
                {/* Left Side: Measurement Inputs */}
                <Grid size={{ xs: 12, md: 7 }}>
                  <Typography variant="overline" sx={{ color: 'text.disabled', fontWeight: 800, mb: 1.5, display: 'block', letterSpacing: 1.5 }}>
                    LIVE LEDGER
                  </Typography>
                  <Card sx={{
                    borderRadius: '24px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
                    border: '1px solid',
                    borderColor: 'divider',
                    overflow: 'hidden'
                  }}>
                    <Stack divider={<Divider />}>
                      {measurementEntries.map(entry => (
                        <Box
                          key={entry.id}
                          onClick={() => setActiveEntryId(entry.id)}
                          sx={{
                            p: 2.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            bgcolor: activeEntryId === entry.id ? alpha('#c49a1a', 0.04) : 'transparent',
                            transition: 'background-color 0.2s ease',
                            cursor: 'pointer'
                          }}
                        >
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            {editingLabel?.id === entry.id ? (
                              <TextField
                                size="small"
                                autoFocus
                                value={editingLabel.draft}
                                onChange={(e) => setEditingLabel({ id: entry.id, draft: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveLabel();
                                  if (e.key === 'Escape') setEditingLabel(null);
                                }}
                                onBlur={handleSaveLabel}
                                onClick={(e) => e.stopPropagation()}
                                inputProps={{ 'aria-label': `Rename ${entry.label}` }}
                                sx={{ maxWidth: 180 }}
                              />
                            ) : (
                              <Stack direction="row" alignItems="center" spacing={0.5}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: activeEntryId === entry.id ? 'secondary.main' : 'text.primary' }}>
                                  {entry.label}
                                </Typography>
                                {!entry.isTemplateField && (
                                  <Tooltip title="Rename">
                                    <IconButton
                                      size="small"
                                      aria-label={`Rename ${entry.label}`}
                                      onClick={(e) => { e.stopPropagation(); setEditingLabel({ id: entry.id, draft: entry.label }); }}
                                    >
                                      <EditIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Stack>
                            )}
                            {entry.isTemplateField && (
                              <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>TEMPLATE METRIC</Typography>
                            )}
                          </Box>
                          <Box sx={{ minWidth: 120 }}>
                            <NumberField
                              fullWidth
                              size="small"
                              value={entry.value}
                              onChange={(val) => {
                                setMeasurementEntries(prev => prev.map(p =>
                                  p.id === entry.id ? { ...p, value: val === "" ? "" : val.toString() } : p
                                ));
                              }}
                              onFocus={() => setActiveEntryId(entry.id)}
                              onEnter={() => handleEntryAutoAdvance(entry.id)}
                              inputRef={(el: any) => entryRefs.current[entry.id] = el}
                              InputProps={{
                                sx: {
                                  fontWeight: 800,
                                  borderRadius: '12px',
                                  bgcolor: activeEntryId === entry.id ? 'background.paper' : alpha('#000', 0.02)
                                },
                                endAdornment: <Typography variant="caption" sx={{ ml: 0.5, color: 'text.disabled', fontWeight: 800 }}>CM</Typography>
                              }}
                            />
                          </Box>
                          <Stack direction="row" sx={{ ml: 0.5, width: 72, justifyContent: 'flex-end' }}>
                            {entry.value !== "" && (
                              <Tooltip title="Clear value">
                                <IconButton
                                  size="small"
                                  aria-label={`Clear ${entry.label}`}
                                  onClick={(e) => { e.stopPropagation(); handleClearEntry(entry.id); }}
                                >
                                  <ClearFieldIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                            {!entry.isTemplateField && (
                              <Tooltip title="Remove measurement">
                                <IconButton
                                  size="small"
                                  aria-label={`Remove ${entry.label}`}
                                  onClick={(e) => { e.stopPropagation(); handleRemoveEntry(entry.id); }}
                                >
                                  <CloseIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        </Box>
                      ))}
                      {measurementEntries.length === 0 && (
                        <Box sx={{ p: 6, textAlign: 'center' }}>
                          <Typography variant="body2" sx={{ color: 'text.disabled' }}>No metrics required for this template.</Typography>
                        </Box>
                      )}
                    </Stack>
                  </Card>

                  <Box sx={{ mt: 3, p: 2, bgcolor: alpha('#000', 0.02), borderRadius: '16px', border: '1px dashed', borderColor: 'divider' }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.disabled', mb: 1, display: 'block' }}>ADD CUSTOM PRECISION POINT</Typography>
                    <Stack direction="row" spacing={1}>
                      <TextField
                        size="small"
                        placeholder="e.g. Wrist, Bicep..."
                        value={newMeasurementLabel}
                        onChange={(e) => setNewMeasurementLabel(e.target.value)}
                        sx={{ bgcolor: 'white', borderRadius: '8px', flex: 1 }}
                      />
                      <Button
                        variant="contained"
                        color="secondary"
                        onClick={handleAddCustomEntry}
                        disabled={!newMeasurementLabel.trim()}
                        sx={{ borderRadius: '8px', fontWeight: 700 }}
                      >
                        Add
                      </Button>
                    </Stack>
                  </Box>
                </Grid>

                {/* Right Side: Virtual Numpad */}
                <Grid size={{ xs: 12, md: 5 }}>
                  <Typography variant="overline" sx={{ color: 'text.disabled', fontWeight: 800, mb: 1.5, display: 'block', letterSpacing: 1.5 }}>
                    QUICK INPUT
                  </Typography>
                  <Card sx={{
                    p: 2.5,
                    bgcolor: 'background.paper',
                    borderRadius: '24px',
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.06)'
                  }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, mb: 3, display: 'block', textAlign: 'center', textTransform: 'uppercase' }}>
                      {activeMeasurementField ? `ENTER ${activeMeasurementField}` : 'SELECT A METRIC'}
                    </Typography>

                    <Grid container spacing={1.5}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0, 'BACK'].map((val) => (
                        <Grid size={{ xs: 4 }} key={val}>
                          <Button
                            fullWidth
                            variant="outlined"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              if (!activeEntryId) return;
                              const targetEntry = measurementEntries.find(e => e.id === activeEntryId);
                              if (!targetEntry) return;
                              const currentVal = targetEntry.value;
                              let nextVal = currentVal;

                              if (val === 'BACK') {
                                nextVal = currentVal.slice(0, -1);
                              } else if (val === '.') {
                                if (!currentVal.includes('.')) nextVal = currentVal + '.';
                              } else {
                                if (currentVal.length < 5) nextVal = currentVal + val;
                              }

                              setMeasurementEntries(prev => prev.map(p =>
                                p.id === activeEntryId ? { ...p, value: nextVal } : p
                              ));
                            }}
                            sx={{
                              height: { xs: 64, md: 80 },
                              borderRadius: '16px',
                              fontSize: val === 'BACK' ? 14 : 26,
                              fontWeight: 800,
                              color: 'text.primary',
                              borderColor: 'divider',
                              bgcolor: alpha('#f8fafc', 0.5),
                              transition: 'all 0.1s ease',
                              '&:hover': { bgcolor: alpha('#c49a1a', 0.1), borderColor: 'secondary.main' },
                              '&:active': { transform: 'scale(0.92)', bgcolor: alpha('#c49a1a', 0.2) }
                            }}
                          >
                            {val === 'BACK' ? <DeleteIcon sx={{ fontSize: 28 }} /> : val}
                          </Button>
                        </Grid>
                      ))}
                    </Grid>
                    <Button
                      fullWidth
                      variant="text"
                      disabled={!activeEntryId}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        if (activeEntryId) handleClearEntry(activeEntryId);
                      }}
                      sx={{ mt: 1.5, fontWeight: 800, color: 'text.secondary' }}
                    >
                      Clear field
                    </Button>
                  </Card>
                </Grid>
              </Grid>

              <Divider sx={{ my: 4 }} />
              <Stack
                direction="row"
                spacing={2}
                justifyContent="space-between"
                sx={{
                  pt: 8,
                  position: { xs: 'fixed', md: 'static' },
                  bottom: { xs: 'calc(64px + env(safe-area-inset-bottom, 0px))', md: 0 },
                  left: 0,
                  right: 0,
                  bgcolor: 'background.paper',
                  p: { xs: 2, md: 0 },
                  borderTop: { xs: '1px solid', md: 'none' },
                  borderColor: 'divider',
                  zIndex: 10,
                  pb: { xs: 'calc(16px + env(safe-area-inset-bottom, 16px))', md: 0 }
                }}
              >
                <Button onClick={() => setStep("FABRIC_DETAILS")} sx={{ color: 'text.primary' }}>Back</Button>
                <Button
                  variant="contained"
                  onClick={() => setStep("SUMMARY")}
                  sx={{ bgcolor: 'secondary.main', height: 52, px: 6, borderRadius: '12px', '&:hover': { bgcolor: '#d4aa2a' } }}
                >
                  Review Order
                </Button>
              </Stack>
            </Box>
          )}
          {step === "SUMMARY" && (
            <Box className="animate-in zoom-in-95 duration-300">
              <Box sx={{ mb: 4 }}>
                <Typography
                   variant="h3"
                   className="mobile-page-title md:text-h2"
                   sx={{
                     fontSize: { xs: '1.75rem', md: 'clamp(1.5rem, 4vw, 2.25rem)' },
                     fontWeight: 800,
                     lineHeight: 1.2,
                     letterSpacing: '-0.02em',
                     mb: 1
                   }}
                >
                  Formalize Order
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', display: { xs: 'block', md: 'none' } }}>
                  Final review before production commitment
                </Typography>
                <Typography
                  variant="h5"
                  sx={{ mb: 4, fontWeight: 700, color: 'text.primary', display: { xs: 'none', md: 'block' } }}
                >
                  5. Formalize Order
                </Typography>
              </Box>

              <Stack spacing={2.5}>
                {/* Information Tiles */}
                <Card sx={{ borderRadius: '24px', border: '1px solid', borderColor: 'divider', boxShadow: '0 8px 32px rgba(0,0,0,0.04)', px: 1 }}>
                  <List>
                    <ListItem sx={{ py: 2 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: alpha('#c49a1a', 0.1), color: 'secondary.main' }}><PersonIcon /></Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={<Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{selectedCustomer?.name || newCustomer.name}</Typography>}
                        secondary={selectedCustomer?.email || newCustomer.email || 'No email provided'}
                      />
                    </ListItem>
                    <Divider variant="inset" component="li" />
                    <ListItem sx={{ py: 2 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: alpha('#c49a1a', 0.1), color: 'secondary.main' }}><TimeIcon /></Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={<Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{eventDate?.toLocaleDateString()}</Typography>}
                        secondary={`Production Deadline • ${stores?.find(s => s.id === chosenStoreId)?.name || 'Unassigned Store'}`}
                      />
                    </ListItem>
                  </List>
                </Card>

                {/* Evidence Tile */}
                <Card sx={{ borderRadius: '24px', border: '1px solid', borderColor: 'divider', boxShadow: 'none', p: 2.5 }}>
                  <Typography variant="overline" sx={{ color: 'text.disabled', fontWeight: 800, mb: 2, display: 'block', letterSpacing: 1.5 }}>EVIDENCE & NOTES</Typography>
                  <Stack direction="row" spacing={3} alignItems="center">
                    <Box sx={{ position: 'relative' }}>
                      {fabricDetails.fabricImageBase64 ? (
                        <Avatar variant="rounded" src={fabricDetails.fabricImageBase64} sx={{ width: 80, height: 80, borderRadius: '16px', border: '1px solid', borderColor: 'divider' }} />
                      ) : (
                        <Avatar variant="rounded" sx={{ width: 80, height: 80, borderRadius: '16px', bgcolor: 'background.default', border: '1px dashed', borderColor: 'divider' }}>
                           <ShirtIcon sx={{ color: 'text.disabled', fontSize: 32 }} />
                        </Avatar>
                      )}
                      <Box sx={{
                        position: 'absolute',
                        bottom: -4,
                        right: -4,
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        bgcolor: fabricDetails.colorSwatch,
                        border: '2px solid white',
                        boxShadow: '0 0 10px rgba(0,0,0,0.1)'
                      }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {fabricName || "External Material"}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, fontStyle: fabricDetails.designNotes ? 'normal' : 'italic' }}>
                        {fabricDetails.designNotes || "No specific design notes provided."}
                      </Typography>
                    </Box>
                  </Stack>
                </Card>

                {/* Line Items Tile */}
                <Box>
                  <Typography variant="overline" sx={{ color: 'text.disabled', fontWeight: 800, mb: 1, ml: 1, display: 'block', letterSpacing: 1.5 }}>
                    LINE ITEMS ({orderItems.length})
                  </Typography>
                  <Card sx={{ borderRadius: '24px', border: '1px solid', borderColor: 'divider', boxShadow: 'none', overflow: 'hidden' }}>
                    <Stack divider={<Divider />}>
                      {orderItems.map((g, i) => (
                        <Box key={i} sx={{ px: 2.5, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Stack direction="row" spacing={2} alignItems="center">
                             <Avatar sx={{ width: 32, height: 32, bgcolor: alpha('#c49a1a', 0.1), color: 'secondary.main', fontSize: 16 }}>
                                {getGarmentIcon(templates?.find(t => t.id === g.templateId)?.name || '')}
                             </Avatar>
                             <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{templates?.find(t => t.id === g.templateId)?.name}</Typography>
                          </Stack>
                          <Typography variant="caption" sx={{ bgcolor: alpha('#1e5c3a', 0.1), color: 'primary.main', px: 1.5, py: 0.5, borderRadius: '99px', fontWeight: 800 }}>READY</Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Card>
                </Box>

                <Stack
                  direction="row"
                  spacing={2}
                  sx={{
                    pt: 8,
                    position: { xs: 'fixed', md: 'static' },
                    bottom: { xs: 'calc(64px + env(safe-area-inset-bottom, 0px))', md: 0 },
                    left: 0,
                    right: 0,
                    bgcolor: 'background.paper',
                    p: { xs: 2.5, md: 0 },
                    borderTop: { xs: '1px solid', md: 'none' },
                    borderColor: 'divider',
                    zIndex: 10,
                    pb: { xs: 'calc(16px + env(safe-area-inset-bottom, 16px))', md: 0 }
                  }}
                >
                  <Button onClick={() => setStep("MEASUREMENTS")} sx={{ color: 'text.secondary', fontWeight: 700 }}>Back</Button>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleCreateOrder}
                    sx={{
                      height: 60,
                      bgcolor: 'primary.main',
                      borderRadius: '16px',
                      fontWeight: 800,
                      fontSize: 16,
                      boxShadow: `0 8px 30px ${alpha('#1e5c3a', 0.2)}`,
                      '&:hover': { bgcolor: '#256b45' }
                    }}
                  >
                    Commit to Production
                  </Button>
                </Stack>
              </Stack>
            </Box>
          )}
        </Card>
      </Box>

      {/* SUCCESS MODAL */}
      <Dialog
        open={Boolean(successOrder)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: '24px', p: 4, textAlign: 'center' }
        }}
      >
        <Box sx={{ py: 2 }}>
          <Box sx={{
            width: 80,
            height: 80,
            bgcolor: alpha('#1e5c3a', 0.1),
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3
          }}>
            <CheckIcon sx={{ fontSize: 48, color: 'primary.main' }} />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, color: 'text.primary' }}>
            Order Created Successfully
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4 }}>
            Order ID: <strong>{(truncateId(successOrder?.id) || '').toUpperCase()}</strong>
          </Typography>
          <Stack spacing={2}>
            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={() => navigate(`/orders/${successOrder?.id}`)}
              sx={{
                bgcolor: 'primary.main',
                height: 60,
                borderRadius: '16px',
                fontWeight: 700,
                '&:hover': { bgcolor: '#256b45' }
              }}
            >
              View Order
            </Button>
            <Button
              variant="outlined"
              fullWidth
              size="large"
              onClick={() => window.location.reload()}
              sx={{
                height: 60,
                borderRadius: '16px',
                borderColor: 'divider',
                color: 'text.primary',
                fontWeight: 600
              }}
            >
              Start New Order
            </Button>
          </Stack>
        </Box>
      </Dialog>
    </Box>
  );
}
