"use strict";

const request = require("supertest");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  adminToken,
  u1Token,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /jobs */

describe("POST /jobs", function () {
  const newJob = {
    title: "New Job",
    salary: 200000,
    equity: "0.5",
    companyHandle: "c1",
  };

  test("ok for admin", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      job: { id: resp.body.job.id, ...newJob },
    });
  });

  test("bad request with missing required data", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send({
        salary: 200000,
        equity: "0.5",
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request with invalid data", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send({
        title: 123,
        salary: "200000",
        equity: "98.6",
        companyHandle: "nonsense_inc",
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** GET /jobs */

describe("GET /jobs", function () {
  test("ok for anon", async function () {
    const resp = await request(app).get("/jobs");
    expect(resp.body).toEqual({
      jobs: [
        {
          id: 1,
          title: "j1",
          salary: 100000,
          equity: "0.1",
          companyHandle: "c1",
        },
        {
          id: 2,
          title: "j2",
          salary: 200000,
          equity: "0.2",
          companyHandle: "c2",
        },
        {
          id: 3,
          title: "j3",
          salary: 300000,
          equity: "0",
          companyHandle: "c1",
        },
      ],
    });
  });

  test("ignores random query strings", async function () {
    const resp = await request(app).get("/jobs?randomQueryString=ingored");
    expect(resp.body).toEqual({
      jobs: [
        {
          id: 1,
          title: "j1",
          salary: 100000,
          equity: "0.1",
          companyHandle: "c1",
        },
        {
          id: 2,
          title: "j2",
          salary: 200000,
          equity: "0.2",
          companyHandle: "c2",
        },
        {
          id: 3,
          title: "j3",
          salary: 300000,
          equity: "0",
          companyHandle: "c1",
        },
      ],
    });
  });

  test("test for json schema invalid", async function () {
    const resp = await request(app).get("/jobs?titleLike=123");
    expect(resp.statusCode).toEqual(400);
  });

  test("test for json schema invalid", async function () {
    const resp = await request(app).get("/jobs?minSalary=hello");
    expect(resp.statusCode).toEqual(400);
  });

  test("test for json schema invalid", async function () {
    const resp = await request(app).get("/jobs?hasEquity=hello");
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** GET /jobs/:id */

describe("GET /jobs/:id", function () {
  test("works for anon", async function () {
    const resp = await request(app).get(`/jobs/1`);
    expect(resp.body).toEqual({
      job: {
        id: 1,
        title: "j1",
        salary: 100000,
        equity: "0.1",
        companyHandle: "c1",
      },
    });
  });

  test("not found for no such job", async function () {
    const resp = await request(app).get(`/jobs/999999999`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /jobs/:id */

describe("PATCH /jobs/:id", function () {
  test("works for admin", async function () {
    const resp = await request(app)
      .patch(`/jobs/1`)
      .send({
        title: "j1-new",
        salary: 111111,
        equity: "0.2",
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body).toEqual({
      job: {
        id: 1,
        title: "j1-new",
        salary: 111111,
        equity: "0.2",
        companyHandle: "c1",
      },
    });
  });

  test("unauth for non-admin", async function () {
    const resp = await request(app)
      .patch(`/jobs/c1`)
      .send({
        title: "j1-new",
        salary: 111111,
        equity: "0.2",
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for anon", async function () {
    const resp = await request(app).patch(`/jobs/c1`).send({
      title: "j1-new",
      salary: 111111,
      equity: "0.2",
    });
    expect(resp.statusCode).toEqual(401);
  });

  test("not found on no such job", async function () {
    const resp = await request(app)
      .patch(`/jobs/999999999`)
      .send({
        title: "new job title",
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("ignores random body entries", async function () {
    const resp = await request(app)
      .patch("/jobs/1")
      .send({
        title: "j1-new",
        salary: 111111,
        equity: "0.2",
        randomKey: "randomValue",
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body).toEqual({
      job: {
        id: 1,
        title: "j1-new",
        salary: 111111,
        equity: "0.2",
        companyHandle: "c1",
      },
    });
  });

  test("bad request on invalid data", async function () {
    const resp = await request(app)
      .patch(`/jobs/1`)
      .send({
        title: 123,
        salary: "200000",
        equity: "98.6",
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** DELETE /jobs/:id */

describe("DELETE /jobs/:id", function () {
  test("works for admin", async function () {
    const resp = await request(app)
      .delete(`/jobs/1`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body).toEqual({ deleted: "1" });
  });

  test("unauth for non-admin", async function () {
    const resp = await request(app)
      .delete(`/jobs/1`)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for anon", async function () {
    const resp = await request(app).delete(`/jobs/1`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found for no such job", async function () {
    const resp = await request(app)
      .delete(`/jobs/999999999`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });
});
