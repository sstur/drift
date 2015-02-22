Globals:
  explain why we must declare in top scope *and* explicitly assign to globals object

Quirks:
  req.body('a') can return undefined
  req.query('a') always returns string, as does headers() and cookies()
  req.query, req.headers, req.cookies and req.body[form-field, multipart-field] will concatenate dups
    req.body[multipart-file] will emit dups but keep only first
  unlike request, response.headers/cookies can return undefined
  You can specify model.insert({created_at: date}) and updated_at
    updated_at will default to created_at or present date

readStream.read() vs readStream.readAll()

why modelInstance._model and not model

findAll()
findAll(conditions)
findAll(conditions, opts)
findAll(fn)
findAll(coditions, fn)
findAll(coditions, opts, fn)

opts = {orderBy: 'rating'}
opts = {orderBy: 'rating', dir: 'desc'}
opts = {orderBy: {field: 'rating', dir: 'desc'}}
opts = {orderBy: ['name', 'rating']}
opts = {orderBy: ['name', {field: 'rating', dir: 'desc'}]}

model.updateWhere(data, conditions, [opts])

require.resolve()
-----------------
resolve: app + app/models/admin
try: app/app/models/admin
try: app/app/models/lib/admin
try: app/app/admin
try: app/app/lib/admin
try: app/admin
try: app/lib/admin
try: admin
try: admin/admin
module not found: app + app/models/admin

