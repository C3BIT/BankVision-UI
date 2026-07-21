import { useState } from "react";
import PropTypes from "prop-types";
import {
  IconButton, Tooltip, Popover, Box, Typography,
  ToggleButton, ToggleButtonGroup, CircularProgress,
} from "@mui/material";
import BlurOnIcon from "@mui/icons-material/BlurOn";
import BlurOffIcon from "@mui/icons-material/BlurOff";
import { isVirtualBackgroundSupported } from "../../utils/browserSupport";

const BG_OPTIONS = [
  { value: "none",  label: "Off",         icon: "✕"  },
  { value: "blur",  label: "Blur",        icon: "🌫" },
  { value: "/bg/office.jpg",    label: "Office",     icon: "🏢" },
  { value: "/bg/mtb-blue.jpg",  label: "MTB Brand",  icon: "🏦" },
];

const VirtualBackgroundMenu = ({ onSelect, activeMode = "none", disabled = false }) => {
  const [anchor, setAnchor] = useState(null);
  const [applying, setApplying] = useState(false);

  const handleOpen = (e) => setAnchor(e.currentTarget);
  const handleClose = () => setAnchor(null);

  const handleSelect = async (_, value) => {
    if (!value || value === activeMode) return;
    setApplying(true);
    try {
      await onSelect(value);
    } finally {
      setApplying(false);
    }
    handleClose();
  };

  const isBlurActive = activeMode === "blur";
  const unsupported = !isVirtualBackgroundSupported;
  const tooltipTitle = unsupported
    ? "Virtual background isn't supported in this browser — try Chrome or Edge"
    : isBlurActive ? "Background: Blur (click to change)" : "Virtual Background";

  return (
    <>
      <Tooltip title={tooltipTitle}>
        <span>
          <IconButton
            onClick={handleOpen}
            disabled={disabled || applying || unsupported}
            size="small"
            sx={{
              color: activeMode !== "none" ? "#00C853" : "rgba(255,255,255,0.7)",
              backgroundColor: "rgba(0,0,0,0.35)",
              "&:hover": { backgroundColor: "rgba(0,0,0,0.55)" },
              width: 40,
              height: 40,
            }}
          >
            {applying
              ? <CircularProgress size={18} sx={{ color: "white" }} />
              : activeMode !== "none" ? <BlurOnIcon fontSize="small" /> : <BlurOffIcon fontSize="small" />
            }
          </IconButton>
        </span>
      </Tooltip>

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={handleClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        transformOrigin={{ vertical: "bottom", horizontal: "center" }}
        PaperProps={{ sx: { borderRadius: 2, p: 2, minWidth: 240 } }}
      >
        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700 }}>
          Background Effect
        </Typography>
        <ToggleButtonGroup
          value={activeMode}
          exclusive
          onChange={handleSelect}
          orientation="horizontal"
          sx={{ flexWrap: "wrap", gap: 1 }}
        >
          {BG_OPTIONS.map((opt) => (
            <ToggleButton
              key={opt.value}
              value={opt.value}
              sx={{
                border: "1px solid #ddd !important",
                borderRadius: "8px !important",
                px: 1.5,
                py: 1,
                textTransform: "none",
                flexDirection: "column",
                gap: 0.5,
                fontSize: "1.2rem",
                lineHeight: 1,
                "&.Mui-selected": {
                  backgroundColor: "#E3F2FD",
                  borderColor: "#1565C0 !important",
                },
              }}
            >
              <span>{opt.icon}</span>
              <Typography variant="caption" sx={{ fontSize: "0.65rem" }}>{opt.label}</Typography>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Popover>
    </>
  );
};

VirtualBackgroundMenu.propTypes = {
  onSelect: PropTypes.func.isRequired,
  activeMode: PropTypes.string,
  disabled: PropTypes.bool,
};

export default VirtualBackgroundMenu;
