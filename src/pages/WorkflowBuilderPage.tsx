import React, { useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DataObjectIcon from '@mui/icons-material/DataObject';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SaveIcon from '@mui/icons-material/Save';
import { Card, CardContent, Button, Chip, Typography, Box, CircularProgress } from '@mui/material';
import { useWorkflowTemplates } from '../features/workflow/hooks/useWorkflowTemplates';
import type { WorkflowTemplate, WorkflowTemplateVersion } from '../features/workflow/workflow.api';

export const WorkflowBuilderPage: React.FC = () => {
  const { data: templates, isLoading, isError } = useWorkflowTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<WorkflowTemplateVersion | null>(null);

  // Select the first template once they load
  React.useEffect(() => {
    if (templates && templates.length > 0 && !selectedTemplate) {
      setSelectedTemplate(templates[0]);
      if (templates[0].versions && templates[0].versions.length > 0) {
        setSelectedVersion(templates[0].versions[0]);
      }
    }
  }, [templates, selectedTemplate]);

  const canEdit = selectedVersion ? (selectedVersion.activeGarments || 0) === 0 : true;

  const handleCreateDraft = () => {
    // Not built yet: should copy the version and bump its number
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-end border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Workflow Template Builder
            </h1>
            <p className="text-slate-400 mt-2 text-lg">Define the operational blueprint for your workshop.</p>
          </div>
          <Button className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 px-6">
            <AddIcon style={{ fontSize: 20 }} /> New Template
          </Button>
        </div>

        <div className="grid grid-cols-12 gap-8">
          {/* Sidebar: Template List */}
          <div className="col-span-3 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 px-2">Templates</h2>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress size={24} />
              </Box>
            ) : isError ? (
              <Box className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                Failed to load templates
              </Box>
            ) : (
              <div className="space-y-1">
                {templates?.map(template => (
                  <button
                    key={template.id}
                    onClick={() => {
                      setSelectedTemplate(template);
                      setSelectedVersion(template.versions?.[0] || null);
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-all flex items-center justify-between group ${
                      selectedTemplate?.id === template.id
                      ? 'bg-slate-800/50 border border-slate-700 text-indigo-400'
                      : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="font-medium">{template.name}</span>
                    <ChevronRightIcon style={{ fontSize: 16 }} className={selectedTemplate?.id === template.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Main Workspace */}
          <div className="col-span-9">
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm shadow-none" sx={{ borderRadius: '16px' }}>
              <Box className="flex flex-row items-center justify-between p-6">
                <Box>
                  <Typography variant="h5" className="text-slate-100 font-bold">{selectedTemplate?.name || 'Select a template'}</Typography>
                  <Typography variant="body2" className="text-slate-400 mt-1">{selectedTemplate?.description}</Typography>
                </Box>
                <Box className="flex items-center gap-3">
                  <Box className="flex bg-slate-800 p-1 rounded-md">
                    {selectedTemplate?.versions?.map(version => (
                      <button
                        key={version.id}
                        onClick={() => setSelectedVersion(version)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                          selectedVersion?.id === version.id
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        v{version.versionNumber}
                      </button>
                    ))}
                  </Box>
                </Box>
              </Box>
              <CardContent className="border-t border-slate-800 pt-6">
                {!selectedTemplate || !selectedVersion ? (
                  <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                    <AccountTreeIcon style={{ fontSize: 48, marginBottom: 16, opacity: 0.2 }} />
                    <p>Select a template to view the production blueprint.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-8">
                      <div className="flex gap-10">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Status</span>
                          <div className="flex items-center gap-2">
                            {selectedTemplate.versions?.[0].id === selectedVersion.id ? (
                              <Chip
                                icon={<CheckCircleOutlineIcon style={{ fontSize: 14, color: 'inherit' }} />}
                                label="Live"
                                size="small"
                                className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-bold"
                                sx={{ borderRadius: '6px' }}
                              />
                            ) : (
                              <Chip
                                label="Legacy"
                                variant="outlined"
                                size="small"
                                className="text-slate-400 border-slate-700 font-bold"
                                sx={{ borderRadius: '6px' }}
                              />
                            )}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Active Garments</span>
                          <p className="text-lg font-semibold text-slate-200">{selectedVersion.activeGarments || 0}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Created</span>
                          <p className="text-sm font-medium text-slate-300">
                            {new Date(selectedVersion.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {canEdit ? (
                        <div className="flex gap-2">
                          <Button variant="outlined" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                            <DeleteOutlineIcon style={{ fontSize: 18 }} className="mr-2" /> Delete Version
                          </Button>
                          <Button className="bg-indigo-600 hover:bg-indigo-500">
                            <SaveIcon style={{ fontSize: 18 }} className="mr-2" /> Save Changes
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={handleCreateDraft}
                          className="bg-amber-600 hover:bg-amber-500 text-white gap-2 shadow-lg shadow-amber-900/20"
                        >
                          <AccountTreeIcon style={{ fontSize: 18 }} /> Create New Version
                        </Button>
                      )}
                    </div>

                    {!canEdit && (
                      <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-200 mt-6">
                        <ErrorOutlineIcon style={{ fontSize: 20 }} className="shrink-0" />
                        <p className="text-sm">
                          <span className="font-bold">Active-Mutation Guard:</span> This version is currently linked to <strong>{selectedVersion.activeGarments} active garments</strong>. Direct editing is prohibited to prevent state corruption. Create a new version to modify this blueprint.
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-4 mt-8">
                      <h3 className="text-lg font-medium flex items-center gap-2">
                        <DataObjectIcon className="text-indigo-400" />
                        Operational Blueprint (DAG)
                      </h3>
                      <div className="space-y-3 relative">
                        {selectedVersion.graphDefinition?.nodes.map((node, index) => (
                          <div key={node.id} className="relative group">
                            {index < selectedVersion.graphDefinition.nodes.length - 1 && (
                              <div className="absolute left-[26px] top-12 w-0.5 h-8 bg-gradient-to-b from-indigo-500 to-slate-800 z-0" />
                            )}
                            <div className={`
                              relative z-10 flex items-center justify-between p-4 rounded-xl border transition-all
                              ${canEdit ? 'bg-slate-900 border-slate-800 hover:border-indigo-500/50' : 'bg-slate-900/30 border-slate-800/50 grayscale-[0.5]'}
                            `}>
                              <div className="flex items-center gap-4">
                                <div className={`
                                  w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg
                                  ${canEdit ? 'bg-indigo-600/20 text-indigo-400' : 'bg-slate-800 text-slate-500'}
                                `}>
                                  {index + 1}
                                </div>
                                <div>
                                  <h4 className="font-semibold text-slate-100">{node.name}</h4>
                                  <p className="text-xs text-slate-500">Constraint: All dependencies must be COMPLETED</p>
                                </div>
                              </div>
                              {canEdit && (
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="text" size="small" className="h-8 w-8 p-0 text-slate-500 hover:text-red-400">
                                    <DeleteOutlineIcon style={{ fontSize: 14 }} />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        {canEdit && (
                          <button className="w-full py-4 border-2 border-dashed border-slate-800 rounded-xl text-slate-500 hover:border-indigo-500/50 hover:text-indigo-400 transition-all flex items-center justify-center gap-2 group">
                            <AddIcon style={{ fontSize: 20 }} className="group-hover:scale-110 transition-transform" /> Add Production Stage
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowBuilderPage;
