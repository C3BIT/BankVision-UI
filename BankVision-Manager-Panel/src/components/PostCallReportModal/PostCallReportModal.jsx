import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormGroup,
  FormControlLabel,
  Checkbox,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Box,
} from "@mui/material";
import PropTypes from "prop-types";
import { privatePost } from "../../services/apiCaller";
import { useSelector } from "react-redux";

const SERVICE_TYPE_OPTIONS = [
  { value: "kyc_verification", label: "KYC / Identity Verification" },
  { value: "phone_change", label: "Phone Number Change" },
  { value: "email_change", label: "Email Change" },
  { value: "address_change", label: "Address Change" },
  { value: "dormant_activation", label: "Dormant Account Activation" },
  { value: "general_inquiry", label: "General Inquiry" },
  { value: "complaint", label: "Complaint" },
  { value: "document_request", label: "Document Request" },
  { value: "other", label: "Other" },
];

const PostCallReportModal = ({ open, callLogId, referenceNumber, onSubmitted, onClose }) => {
  const { token } = useSelector((state) => state.auth);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setServiceTypes([]);
      setRemarks("");
      setError(null);
    }
  }, [open]);

  const handleServiceTypeChange = (value) => (e) => {
    if (e.target.checked) {
      setServiceTypes((prev) => [...prev, value]);
    } else {
      setServiceTypes((prev) => prev.filter((s) => s !== value));
    }
    setError(null);
  };

  const handleSubmit = async () => {
    if (!callLogId) {
      setError("Call reference is missing. Please close and try again.");
      return;
    }
    if (serviceTypes.length === 0) {
      setError("Please select at least one type of service provided.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await privatePost(
        "/call-reports",
        token,
        { callLogId, serviceTypes, remarks: remarks.trim() || null }
      );
      onSubmitted?.();
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Failed to submit report. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => {}} maxWidth="sm" fullWidth disableEscapeKeyDown>
      <DialogTitle>
        <Typography variant="h6" component="span" sx={{ fontWeight: 600, color: "#1a1a1a" }}>
          Post-Call Report
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Please submit a brief report for CRM and audit. This helps with lead generation and
          downstream workflows.
        </Typography>
        {referenceNumber && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
            Reference: {referenceNumber}
          </Typography>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          Type of service provided (select all that apply)
        </Typography>
        <FormGroup sx={{ mb: 2 }}>
          {SERVICE_TYPE_OPTIONS.map((opt) => (
            <FormControlLabel
              key={opt.value}
              control={
                <Checkbox
                  checked={serviceTypes.includes(opt.value)}
                  onChange={handleServiceTypeChange(opt.value)}
                  size="small"
                  sx={{ color: "#0066FF", "&.Mui-checked": { color: "#0066FF" } }}
                />
              }
              label={opt.label}
              sx={{ "& .MuiFormControlLabel-label": { fontSize: "0.9rem" } }}
            />
          ))}
        </FormGroup>

        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          Remarks / notes (optional)
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={3}
          placeholder="Notes for CRM and audit..."
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          variant="outlined"
          size="small"
          sx={{
            "& .MuiOutlinedInput-root": {
              backgroundColor: "#fafafa",
              "& fieldset": { borderColor: "#e0e0e0" },
            },
          }}
        />

      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleSubmit} variant="contained" disabled={submitting} sx={{ minWidth: 120 }}>
          {submitting ? <CircularProgress size={24} /> : "Submit Report"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

PostCallReportModal.propTypes = {
  open: PropTypes.bool.isRequired,
  callLogId: PropTypes.string,
  referenceNumber: PropTypes.string,
  onSubmitted: PropTypes.func.isRequired,
  onClose: PropTypes.func,
};

export default PostCallReportModal;
