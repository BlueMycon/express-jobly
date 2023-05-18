"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/* id, title, salary, equity, company_handle */

/************************************** create */

describe("create", function () {
  const newJob = {
    title: "New Job",
    salary: 200000,
    equity: 1.01,
    companyHandle: "c1",
  };

  test("works", async function () {
    let job = await Job.create(newJob);
    expect(job).toEqual(newJob);

    const result = await db.query(
          `SELECT id, title, salary, equity, company_handle
           FROM jobs
           WHERE id = ${job.id}`);
    expect(result.rows).toEqual([
      {
        id: `${job.id}`,
        title: "New Job",
        salary: 200000,
        equity: 1.01,
        company_handle: "c1",
      },
    ]);
  });

  
});

/************************************** findAll */

describe("findAllWithFilter", function () {
  test("works: no filter", async function () {
    let jobs = await Job.findAllWithFilter({});
    expect(jobs).toEqual([
      {
        id: "c1",
        title: "C1",
        salary: "Desc1",
        equity: 1,
        companyHandle: "http://c1.img",
      },
      {
        id: "c2",
        title: "C2",
        salary: "Desc2",
        equity: 2,
        companyHandle: "http://c2.img",
      },
      {
        id: "c3",
        title: "C3",
        salary: "Desc3",
        equity: 3,
        companyHandle: "http://c3.img",
      },
    ]);
  });

  test("works: with filter for title", async function () {
    let jobs = await Job.findAllWithFilter({titleLike: "C1"});
    expect(jobs).toEqual([
      {
        id: "c1",
        title: "C1",
        salary: "Desc1",
        equity: 1,
        companyHandle: "http://c1.img",
      },
    ]);
  });

  test("works: with filter for min and max employees", async function () {
    let jobs = await Job.findAllWithFilter({minEmployees: 2, maxEmployees: 3});
    expect(jobs).toEqual([
      {
        id: "c2",
        title: "C2",
        salary: "Desc2",
        equity: 2,
        companyHandle: "http://c2.img",
      },
      {
        id: "c3",
        title: "C3",
        salary: "Desc3",
        equity: 3,
        companyHandle: "http://c3.img",
      },
    ]);
  });
});
/************************************** sqlForFiltering */


describe("sqlForFiltering", function () {
  test("works where all fields passed in", function () {
    const dataToFilter = { titleLike: 'net', minEmployees: 10, maxEmployees: 400 };
    const sql = Job.sqlForFiltering(dataToFilter);

    expect(sql).toEqual({
      whereClause: '\nWHERE title ILIKE $1 AND equity >= $2 AND equity <= $3',
      values: ['%net%', 10, 400],
    });
  });

  test("works for 2 fields", function () {
    const dataToFilter = { titleLike: 'net', minEmployees: 10};
    const sql = Job.sqlForFiltering(dataToFilter);

    expect(sql).toEqual({
      whereClause: '\nWHERE title ILIKE $1 AND equity >= $2',
      values: ['%net%', 10],
    });
  });

  test("works for min and maxEmployees", function () {
    const dataToFilter = { minEmployees: 10, maxEmployees: 400 };
    const sql = Job.sqlForFiltering(dataToFilter);

    expect(sql).toEqual({
      whereClause: '\nWHERE equity >= $1 AND equity <= $2',
      values: [10, 400],
    });
  });


  test("return if data undefined", function () {
    let dataToFilter;
    expect(Job.sqlForFiltering(dataToFilter)).toEqual({whereClause: "", values: []});
  });


  test("return immediately if data empty", function () {
    const dataToFilter = {};
    expect(Job.sqlForFiltering(dataToFilter)).toEqual({whereClause: "", values: []});
  });
});


/************************************** get */

describe("get", function () {
  test("works", async function () {
    let job = await Job.get("c1");
    expect(job).toEqual({
      id: "c1",
      title: "C1",
      salary: "Desc1",
      equity: 1,
      companyHandle: "http://c1.img",
    });
  });

  test("not found if no such job", async function () {
    try {
      await Job.get("nope");
      throw new Error("fail test, you shouldn't get here");
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** update */

describe("update", function () {
  const updateData = {
    title: "New",
    salary: "New Description",
    equity: 10,
    companyHandle: "http://new.img",
  };

  test("works", async function () {
    let job = await Job.update("c1", updateData);
    expect(job).toEqual({
      id: "c1",
      ...updateData,
    });

    const result = await db.query(
          `SELECT id, title, salary, equity, company_handle
           FROM jobs
           WHERE id = 'c1'`);
    expect(result.rows).toEqual([{
      id: "c1",
      title: "New",
      salary: "New Description",
      equity: 10,
      company_handle: "http://new.img",
    }]);
  });

  test("works: null fields", async function () {
    const updateDataSetNulls = {
      title: "New",
      salary: "New Description",
      equity: null,
      companyHandle: null,
    };

    let job = await Job.update("c1", updateDataSetNulls);
    expect(job).toEqual({
      id: "c1",
      ...updateDataSetNulls,
    });

    const result = await db.query(
          `SELECT id, title, salary, equity, company_handle
           FROM jobs
           WHERE id = 'c1'`);
    expect(result.rows).toEqual([{
      id: "c1",
      title: "New",
      salary: "New Description",
      equity: null,
      company_handle: null,
    }]);
  });

  test("not found if no such job", async function () {
    try {
      await Job.update("nope", updateData);
      throw new Error("fail test, you shouldn't get here");
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request with no data", async function () {
    try {
      await Job.update("c1", {});
      throw new Error("fail test, you shouldn't get here");
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** remove */

describe("remove", function () {
  test("works", async function () {
    await Job.remove("c1");
    const res = await db.query(
        "SELECT id FROM jobs WHERE id='c1'");
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such job", async function () {
    try {
      await Job.remove("nope");
      throw new Error("fail test, you shouldn't get here");
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});
