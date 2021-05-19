app.cfg({
  auto_save_uploads: false,
  virtual_url: false,
  response_404: {
    type: 'text/plain',
    body: '{"error":"404 Not Found"}',
  },
  smtp: {
    host: 'localhost',
    port: 25,
  },
  session: {
    default_datastore: 'memory',
  },
  template_defaults: {},
});
