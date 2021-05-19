app.cfg({
  auto_save_uploads: false,
  response_404: {
    type: 'text/plain',
    body: '{"error":"404 Not Found"}',
  },
});
