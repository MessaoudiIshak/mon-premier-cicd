const request = require('supertest');
const app = require('../server');

describe('GET /health', () => {
  test('returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 'ok', version: '1.0.0' });
  });
});

describe('GET /calc/:op/:a/:b', () => {
  test('add 2 + 3 = 5', async () => {
    const res = await request(app).get('/calc/add/2/3');
    expect(res.statusCode).toBe(200);
    expect(res.body.result).toBe(5);
  });

  test('subtract 10 - 4 = 6', async () => {
    const res = await request(app).get('/calc/subtract/10/4');
    expect(res.statusCode).toBe(200);
    expect(res.body.result).toBe(6);
  });

  test('multiply 3 * 4 = 12', async () => {
    const res = await request(app).get('/calc/multiply/3/4');
    expect(res.statusCode).toBe(200);
    expect(res.body.result).toBe(12);
  });

  test('divide 10 / 2 = 5', async () => {
    const res = await request(app).get('/calc/divide/10/2');
    expect(res.statusCode).toBe(200);
    expect(res.body.result).toBe(5);
  });

  test('divide by zero returns 400', async () => {
    const res = await request(app).get('/calc/divide/10/0');
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Division par zéro impossible');
  });

  test('unknown operation returns 400', async () => {
    const res = await request(app).get('/calc/unknown/1/2');
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Unknown op');
  });
});
