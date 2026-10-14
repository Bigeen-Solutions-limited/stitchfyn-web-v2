import { Typography, Box, useTheme } from "@mui/material"
import type { RiskStatus } from "./RiskChip"

interface DeadlineDisplayProps {
  deadline: Date
  riskStatus: RiskStatus
}

// Deadlines must always be at least h5 so they stand out
export function DeadlineDisplay({
  deadline,
  riskStatus,
}: DeadlineDisplayProps) {
  const theme = useTheme()

  const getRiskColor = () => {
    switch (riskStatus) {
      case "ON_TRACK":
        return theme.palette.risk.onTrack
      case "AT_RISK":
        return theme.palette.risk.atRisk
      case "OVERDUE":
        return theme.palette.risk.overdue
      case "UNKNOWN":
      default:
        return theme.palette.risk.unknown
    }
  }

  const getRelativeTime = (date: Date) => {
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      const absDays = Math.abs(diffDays)
      return `${absDays} day${absDays === 1 ? "" : "s"} overdue`
    }
    if (diffDays === 0) return "due today"
    return `in ${diffDays} day${diffDays === 1 ? "" : "s"}`
  }

  return (
    <Box>
      <Typography
        variant="h5"
        sx={{
          color: getRiskColor(),
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        {getRelativeTime(deadline)}
      </Typography>
      <Typography variant="body2" color="textSecondary">
        Deadline: {deadline.toLocaleDateString()}
      </Typography>
    </Box>
  )
}
