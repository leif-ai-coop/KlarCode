import ContentCopyIcon from '@mui/icons-material/ContentCopy';

const handleCopyNotFoundCode = (code) => {
  navigator.clipboard.writeText(code)
    .then(() => {
      alert(`Code "${code}" wurde in die Zwischenablage kopiert`);
    })
    .catch(err => {
      console.error('Fehler beim Kopieren:', err);
      alert('Fehler beim Kopieren in die Zwischenablage.');
    });
};

{errors.map((error, index) => {
  const match = error.match(/: ([A-Za-z0-9.-]+)$/);
  const code = match ? match[1] : null;
  
  return (
    <Alert
      key={index}
      severity="error"
      sx={{ mb: 2 }}
      action={
        code && (
          <IconButton
            aria-label="copy code"
            color="inherit"
            size="small"
            onClick={() => handleCopyNotFoundCode(code)}
          >
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        )
      }
    >
      {error}
    </Alert>
  );
})} 