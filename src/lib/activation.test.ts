import { describe, it, expect } from "vitest"
import { canAcknowledgeDeposit, waitingFor } from "./activation"

describe("activation gate helpers (LR-1 / D-1)", () => {
  it("formats the PRD 'Waiting for' message", () => {
    expect(waitingFor(["payment", "fabric", "design"])).toBe("Waiting for: Deposit, Fabric confirmation, Design approval")
  })

  it("lets OWNER or MANAGER acknowledge a pending deposit only", () => {
    expect(canAcknowledgeDeposit(["payment"], "OWNER")).toBe(true)
    expect(canAcknowledgeDeposit(["payment"], "MANAGER")).toBe(true)
    expect(canAcknowledgeDeposit(["payment"], "TAILOR")).toBe(false)
    expect(canAcknowledgeDeposit(["payment", "fabric"], "OWNER")).toBe(false)
    expect(canAcknowledgeDeposit(["design"], "OWNER")).toBe(false)
  })
})
