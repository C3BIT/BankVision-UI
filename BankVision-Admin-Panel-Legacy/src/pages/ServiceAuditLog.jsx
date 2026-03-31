import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  TextField,
  Button,
  CircularProgress,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  Collapse,
  IconButton,
  Divider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterListIcon from '@mui/icons-material/FilterList';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import HomeIcon from '@mui/icons-material/Home';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ImageIcon from '@mui/icons-material/Image';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import api from '../services/api';

const CHANGE_TYPE_CONFIG = {
  phone:   { label: 'Phone',   icon: <PhoneIcon sx={{ fontSize: 16 }} />, color: '#1565C0' },
  email:   { label: 'Email',   icon: <EmailIcon sx={{ fontSize: 16 }} />, color: '#6A1B9A' },
  address: { label: 'Address', icon: <HomeIcon  sx={{ fontSize: 16 }} />, color: '#2E7D32' },
};

const STATUS_CONFIG = {
  approved: { label: 'Approved', color: 'success', icon: <CheckCircleIcon sx={{ fontSize: 14 }} /> },
  rejected: { label: 'Rejected', color: 'error',   icon: <CancelIcon     sx={{ fontSize: 14 }} /> },
  pending:  { label: 'Pending',  color: 'warning',  icon: null },
};

const ExpandableRow = ({ row }) => {
  const [open, setOpen] = useState(false);

  const typeConfig  = CHANGE_TYPE_CONFIG[row.changeType] || {};
  const statusConfig = STATUS_CONFIG[row.status] || {};

  const parseAddressValue = (raw) => {
    if (!raw) return { text: '—', documents: [] };
    try {
      const obj = JSON.parse(raw);
      const parts = [obj.addressLine1, obj.addressLine2, obj.upazila, obj.district, obj.postCode].filter(Boolean);
      return { text: parts.join(', ') || raw, documents: obj.documents || [] };
    } catch {
      return { text: raw, documents: [] };
    }
  };

  const addressNewValue = row.changeType === 'address' ? parseAddressValue(row.newValue) : null;

  const displayValue = (val) =>
    row.changeType === 'address' ? parseAddressValue(val).text : (val || '—');

  const API_BASE_URL = (process.env.REACT_APP_API_URL || '').replace('/api', '');
  const getFullUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${API_BASE_URL}/${url.startsWith('/') ? url.substring(1) : url}`;
  };

  const getDocIcon = (type = '') => {
    if (type.startsWith('image/')) return <ImageIcon sx={{ fontSize: 18, color: '#1565C0' }} />;
    if (type === 'application/pdf') return <PictureAsPdfIcon sx={{ fontSize: 18, color: '#C62828' }} />;
    return <InsertDriveFileIcon sx={{ fontSize: 18, color: '#666' }} />;
  };

  return (
    <>
      <TableRow
        hover
        sx={{ cursor: 'pointer', '& > *': { borderBottom: 'unset' } }}
        onClick={() => setOpen((o) => !o)}
      >
        <TableCell sx={{ width: 40, pr: 0 }}>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}>
            {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
        </TableCell>

        <TableCell>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
            {row.customerId}
          </Typography>
        </TableCell>

        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box sx={{ color: typeConfig.color, display: 'flex' }}>{typeConfig.icon}</Box>
            <Typography variant="body2" sx={{ fontWeight: 500, color: typeConfig.color }}>
              {typeConfig.label}
            </Typography>
          </Box>
        </TableCell>

        <TableCell>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {row.manager?.name || `Manager #${row.managerId}`}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {row.manager?.email || ''}
          </Typography>
        </TableCell>

        <TableCell>
          <Chip
            size="small"
            label={statusConfig.label}
            color={statusConfig.color}
            icon={statusConfig.icon}
            sx={{ fontWeight: 600 }}
          />
        </TableCell>

        <TableCell>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
            {new Date(row.createdAt).toLocaleString('en-GB', {
              day: '2-digit', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </Typography>
        </TableCell>
      </TableRow>

      {/* Expanded detail row */}
      <TableRow>
        <TableCell colSpan={6} sx={{ py: 0 }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box
              sx={{
                m: 1.5,
                p: 2,
                backgroundColor: '#F8F9FA',
                borderRadius: 2,
                border: '1px solid #E0E0E0',
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, color: '#1A1A1A' }}>
                Decision Details
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 2 }}>
                {/* Old value */}
                <Box>
                  <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 0.25 }}>
                    Previous Value
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      p: 1, borderRadius: 1,
                      backgroundColor: '#FFE5E5',
                      color: '#C62828',
                      fontFamily: row.changeType === 'address' ? 'inherit' : 'monospace',
                      wordBreak: 'break-all',
                    }}
                  >
                    {displayValue(row.oldValue)}
                  </Typography>
                </Box>

                {/* New value */}
                <Box>
                  <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 0.25 }}>
                    New Value
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      p: 1, borderRadius: 1,
                      backgroundColor: row.status === 'approved' ? '#E8F5E9' : '#F5F5F5',
                      color: row.status === 'approved' ? '#2E7D32' : '#757575',
                      fontFamily: row.changeType === 'address' ? 'inherit' : 'monospace',
                      wordBreak: 'break-all',
                    }}
                  >
                    {displayValue(row.newValue)}
                  </Typography>
                </Box>

                {/* Rejection reason */}
                {row.status === 'rejected' && row.rejectionReason && (
                  <Box>
                    <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 0.25 }}>
                      Rejection Reason
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        p: 1, borderRadius: 1,
                        backgroundColor: '#FFF3E0',
                        color: '#E65100',
                      }}
                    >
                      {row.rejectionReason}
                    </Typography>
                  </Box>
                )}

                {/* IP address */}
                <Box>
                  <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 0.25 }}>
                    Origin IP
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#424242' }}>
                    {row.ipAddress || '—'}
                  </Typography>
                </Box>
              </Box>

              {/* Supporting documents (address changes) */}
              {addressNewValue && addressNewValue.documents.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#1A1A1A' }}>
                    Supporting Documents ({addressNewValue.documents.length})
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    {addressNewValue.documents.map((doc, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 1.5,
                          p: 1.25,
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E0E0E0',
                          borderRadius: 1.5,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          '&:hover': {
                            borderColor: '#0066FF',
                            backgroundColor: '#F0F7FF',
                            transform: 'translateY(-1px)',
                            boxShadow: '0 2px 6px rgba(0,102,255,0.12)',
                          },
                        }}
                        onClick={() => window.open(getFullUrl(doc.url || doc.path), '_blank')}
                      >
                        {getDocIcon(doc.type || doc.mimetype)}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 600, color: '#1A1A1A',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}
                          >
                            {doc.name || doc.originalName || `Document ${idx + 1}`}
                          </Typography>
                          {doc.size && (
                            <Typography variant="caption" sx={{ color: '#999' }}>
                              {(doc.size / 1024).toFixed(1)} KB
                            </Typography>
                          )}
                        </Box>
                        <OpenInNewIcon sx={{ fontSize: 16, color: '#0066FF' }} />
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}

              {addressNewValue && addressNewValue.documents.length === 0 && row.changeType === 'address' && (
                <Box sx={{ mt: 1.5 }}>
                  <Typography variant="caption" sx={{ color: '#999', fontStyle: 'italic' }}>
                    No supporting documents were uploaded for this address change.
                  </Typography>
                </Box>
              )}

              <Divider sx={{ my: 1.5 }} />

              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                <Typography variant="caption" sx={{ color: '#999' }}>
                  Record ID: <strong>{row.id}</strong>
                </Typography>
                <Typography variant="caption" sx={{ color: '#999' }}>
                  Manager ID: <strong>{row.managerId}</strong>
                </Typography>
                <Typography variant="caption" sx={{ color: '#999' }}>
                  Timestamp: <strong>{new Date(row.createdAt).toISOString()}</strong>
                </Typography>
              </Box>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

const ServiceAuditLog = () => {
  const [rows, setRows]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount]   = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [filterCustomer,   setFilterCustomer]   = useState('');
  const [filterStatus,     setFilterStatus]     = useState('');
  const [filterChangeType, setFilterChangeType] = useState('');
  const [filterDateFrom,   setFilterDateFrom]   = useState('');
  const [filterDateTo,     setFilterDateTo]     = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
      };
      if (filterCustomer)   params.customerId  = filterCustomer;
      if (filterStatus)     params.status      = filterStatus;
      if (filterChangeType) params.changeType  = filterChangeType;
      if (filterDateFrom)   params.dateFrom    = filterDateFrom;
      if (filterDateTo)     params.dateTo      = filterDateTo;

      const response = await api.get('/admin/change-requests', { params });
      if (response.data.success) {
        setRows(response.data.data.requests);
        setTotalCount(response.data.data.pagination.total);
      }
    } catch (err) {
      console.error('Failed to load change requests:', err);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, filterCustomer, filterStatus, filterChangeType, filterDateFrom, filterDateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApplyFilters = () => {
    setPage(0);
    fetchData();
  };

  const handleClearFilters = () => {
    setFilterCustomer('');
    setFilterStatus('');
    setFilterChangeType('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setPage(0);
  };

  // Summary counts from current result set (for quick visual)
  const approvedCount = rows.filter((r) => r.status === 'approved').length;
  const rejectedCount = rows.filter((r) => r.status === 'rejected').length;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} color="primary.dark">
          Service Change Audit Log
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Full traceability of every service change — who approved or rejected it, on what basis, and when.
        </Typography>
      </Box>

      {/* Summary chips */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Chip
          label={`Total: ${totalCount}`}
          sx={{ fontWeight: 700, backgroundColor: '#E3F2FD', color: '#1565C0' }}
        />
        <Chip
          label={`Approved: ${approvedCount}`}
          sx={{ fontWeight: 700, backgroundColor: '#E8F5E9', color: '#2E7D32' }}
          icon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
        />
        <Chip
          label={`Rejected: ${rejectedCount}`}
          sx={{ fontWeight: 700, backgroundColor: '#FFEBEE', color: '#C62828' }}
          icon={<CancelIcon sx={{ fontSize: 16 }} />}
        />
      </Box>

      <Paper sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        {/* Toolbar */}
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            borderBottom: '1px solid #E0E0E0',
            flexWrap: 'wrap',
          }}
        >
          <TextField
            size="small"
            placeholder="Search customer ID / phone..."
            value={filterCustomer}
            onChange={(e) => setFilterCustomer(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ width: 260 }}
          />

          <Button
            size="small"
            variant={showFilters ? 'contained' : 'outlined'}
            startIcon={<FilterListIcon />}
            onClick={() => setShowFilters((v) => !v)}
          >
            Filters
          </Button>

          <Box sx={{ flex: 1 }} />

          <Tooltip title="Refresh">
            <IconButton size="small" onClick={fetchData} disabled={loading}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Expandable filter bar */}
        <Collapse in={showFilters}>
          <Box
            sx={{
              px: 2, py: 1.5,
              display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center',
              backgroundColor: '#FAFAFA',
              borderBottom: '1px solid #E0E0E0',
            }}
          >
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                label="Status"
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Change Type</InputLabel>
              <Select
                value={filterChangeType}
                label="Change Type"
                onChange={(e) => setFilterChangeType(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="phone">Phone</MenuItem>
                <MenuItem value="email">Email</MenuItem>
                <MenuItem value="address">Address</MenuItem>
              </Select>
            </FormControl>

            <TextField
              size="small"
              label="From Date"
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 160 }}
            />

            <TextField
              size="small"
              label="To Date"
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 160 }}
            />

            <Button size="small" variant="contained" onClick={handleApplyFilters}>
              Apply
            </Button>
            <Button size="small" variant="text" onClick={handleClearFilters}>
              Clear
            </Button>
          </Box>
        </Collapse>

        {/* Table */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : rows.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography color="text.secondary">No change requests found.</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#F5F5F5' }}>
                  <TableCell sx={{ width: 40 }} />
                  <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Change Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Decided By (Manager)</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Decision</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Date &amp; Time</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <ExpandableRow key={row.id} row={row} />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>
    </Box>
  );
};

export default ServiceAuditLog;
