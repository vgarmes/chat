import express from 'express';
import logger from 'morgan';

const port = process.env.PORT ?? 5000;

const app = express();
app.use(logger('dev'));

app.get('/', (req, res) => {
  res.send('<h1>hello world!!</h1>');
});

app.listen(port, () => `Server running on port ${port}`);
