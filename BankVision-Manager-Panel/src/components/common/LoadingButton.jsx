import { Button, CircularProgress } from '@mui/material';

const LoadingButton = ({
  loading,
  children,
  disabled,
  ...props
}) => {
  return (
    <Button
      disabled={loading || disabled}
      {...props}
    >
      {loading ? (
        <>
          <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
          Loading...
        </>
      ) : (
        children
      )}
    </Button>
  );
};

export default LoadingButton;