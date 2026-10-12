import { describe, it, expect, vi } from "vitest"
import { parseApiError } from "./parse-api-error"
import { ErrorCodes } from "./error-codes"
import { errorMessages } from "./error-messages"

// Mock axios.isAxiosError
vi.mock("axios", async () => {
  const actual = (await vi.importActual("axios")) as any
  return {
    ...actual,
    default: {
      ...(actual.default ?? {}),
      isAxiosError: (err: any) => err && err.isAxiosError === true,
    },
    isAxiosError: (err: any) => err && err.isAxiosError === true,
  }
})

describe("parseApiError", () => {
  it("returns correct mapped message for known domain code", () => {
    const error = {
      isAxiosError: true,
      response: {
        data: { code: ErrorCodes.CAPACITY_LIMIT_EXCEEDED },
      },
    }

    const result = parseApiError(error)
    expect(result).toEqual(errorMessages.CAPACITY_LIMIT_EXCEEDED)
  })

  it("returns UNKNOWN_ERROR for unknown domain code", () => {
    const error = {
      isAxiosError: true,
      response: {
        data: { code: "TOTALLY_UNKNOWN_CODE" },
      },
    }

    const result = parseApiError(error)
    expect(result).toEqual(errorMessages.UNKNOWN_ERROR)
  })

  it("returns connection error message for network error (no response)", () => {
    const error = {
      isAxiosError: true,
      // no response property
    }

    const result = parseApiError(error)
    expect(result.title).toBe("Connection Error")
    expect(result.detail).toContain("Check your connection")
  })

  it("returns UNKNOWN_ERROR for non-Axios error", () => {
    const error = new Error("Some random error")

    const result = parseApiError(error)
    expect(result).toEqual(errorMessages.UNKNOWN_ERROR)
  })

  it("returns correct message for validation error with field", () => {
    const error = {
      isAxiosError: true,
      response: {
        data: { code: ErrorCodes.MATERIAL_PHOTO_REQUIRED },
      },
    }

    const result = parseApiError(error)
    expect(result).toEqual(errorMessages.MATERIAL_PHOTO_REQUIRED)
    expect(result.field).toBe("photoUrl")
  })

  it("prefers metadata.reason over the generic code when both are present", () => {
    const error = {
      isAxiosError: true,
      response: {
        data: {
          code: ErrorCodes.CONFLICT,
          metadata: { reason: ErrorCodes.PROGRESS_PHOTO_LIMIT_REACHED },
        },
      },
    }

    const result = parseApiError(error)
    expect(result).toEqual(errorMessages.PROGRESS_PHOTO_LIMIT_REACHED)
  })

  it("maps the QC/Collection Review Photo Gate's PROGRESS_PHOTO_REQUIRED reason to its own message, not the generic CONFLICT one", () => {
    const error = {
      isAxiosError: true,
      response: {
        data: {
          code: ErrorCodes.CONFLICT,
          metadata: { reason: ErrorCodes.PROGRESS_PHOTO_REQUIRED },
        },
      },
    }

    const result = parseApiError(error)
    expect(result).toEqual(errorMessages.PROGRESS_PHOTO_REQUIRED)
  })

  it("maps US-4.8's FINAL_QUALITY_REVIEW_NOT_READY reason to its own message, not the generic CONFLICT one", () => {
    const error = {
      isAxiosError: true,
      response: {
        data: {
          code: ErrorCodes.CONFLICT,
          metadata: { reason: ErrorCodes.FINAL_QUALITY_REVIEW_NOT_READY },
        },
      },
    }

    const result = parseApiError(error)
    expect(result).toEqual(errorMessages.FINAL_QUALITY_REVIEW_NOT_READY)
  })

  it("maps US-4.8's FINAL_QUALITY_REVIEW_ALREADY_COMPLETED reason to its own message", () => {
    const error = {
      isAxiosError: true,
      response: {
        data: {
          code: ErrorCodes.CONFLICT,
          metadata: { reason: ErrorCodes.FINAL_QUALITY_REVIEW_ALREADY_COMPLETED },
        },
      },
    }

    const result = parseApiError(error)
    expect(result).toEqual(errorMessages.FINAL_QUALITY_REVIEW_ALREADY_COMPLETED)
  })

  it("falls back to the generic code when metadata.reason is absent or unrecognized", () => {
    const error = {
      isAxiosError: true,
      response: {
        data: { code: ErrorCodes.CONFLICT, metadata: { reason: "something-unmapped" } },
      },
    }

    const result = parseApiError(error)
    expect(result).toEqual(errorMessages.CONFLICT)
  })

  it("maps AUTH_SESSION_EXPIRED correctly", () => {
    const error = {
      isAxiosError: true,
      response: {
        data: { code: ErrorCodes.AUTH_SESSION_EXPIRED },
      },
    }

    const result = parseApiError(error)
    expect(result).toEqual(errorMessages.AUTH_SESSION_EXPIRED)
  })
  it("names the missing activation steps for ACTIVATION_INCOMPLETE (LR-1)", () => {
    const error = {
      isAxiosError: true,
      response: {
        data: { code: ErrorCodes.ACTIVATION_INCOMPLETE, metadata: { missingSteps: ["payment", "fabric"] } },
      },
    }

    const result = parseApiError(error)
    expect(result.title).toBe(errorMessages.ACTIVATION_INCOMPLETE.title)
    expect(result.detail).toBe("Waiting for: Deposit, Fabric confirmation")
  })
})
