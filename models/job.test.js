"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const { DatabaseError } = require("pg");
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

/************************************** create */

describe("create", function () {
  const newJob = {
    title: "New Job",
    salary: 200000,
    equity: 0.5,
    companyHandle: "c1",
  };

  test("works", async function () {
    let job = await Job.create(newJob);
    expect(job).toEqual({
      id: job.id,
      title: "New Job",
      salary: 200000,
      equity: "0.5", // NUMERIC returns as string
      companyHandle: "c1",
    });

    const result = await db.query(
      `SELECT id, title, salary, equity, company_handle AS "companyHandle"
           FROM jobs
           WHERE id = ${job.id}`
    );
    expect(result.rows).toEqual([
      {
        id: job.id,
        title: "New Job",
        salary: 200000,
        equity: "0.5", // NUMERIC returns as string
        companyHandle: "c1",
      },
    ]);
  });

  const newJob2 = {
    title: "New Job",
    salary: 200000,
    equity: 0.7,
    companyHandle: "nonsense?!",
  };

  test("no such company exists", async function () {
    try {
      await Job.create(newJob2);
      throw new Error("fail test, you shouldn't get here");
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** findAll */

describe("findAllWithFilter", function () {
  test("works: no filter", async function () {
    let jobs = await Job.findAllWithFilter({});
    expect(jobs).toEqual([
      {
        id: 1,
        title: "j1",
        salary: 100000,
        equity: "0.5",
        companyHandle: "c1",
      },
      {
        id: 2,
        title: "j2",
        salary: 200000,
        equity: "0.7",
        companyHandle: "c2",
      },
      {
        id: 3,
        title: "j3",
        salary: 300000,
        equity: "0",
        companyHandle: "c1",
      },
    ]);
  });

  test("works: with filter for title", async function () {
    let jobs = await Job.findAllWithFilter({ titleLike: "j1" });
    expect(jobs).toEqual([
      {
        id: 1,
        title: "j1",
        salary: 100000,
        equity: "0.5",
        companyHandle: "c1",
      },
    ]);
  });

  test("works: with filter for minSalary", async function () {
    let jobs = await Job.findAllWithFilter({ minSalary: 200000 });
    expect(jobs).toEqual([
      {
        id: 2,
        title: "j2",
        salary: 200000,
        equity: "0.7",
        companyHandle: "c2",
      },
      {
        id: 3,
        title: "j3",
        salary: 300000,
        equity: "0",
        companyHandle: "c1",
      },
    ]);
  });

  test("works: with filter for has equity", async function () {
    let jobs = await Job.findAllWithFilter({ hasEquity: true });
    expect(jobs).toEqual([
      {
        id: 1,
        title: "j1",
        salary: 100000,
        equity: "0.5",
        companyHandle: "c1",
      },
      {
        id: 2,
        title: "j2",
        salary: 200000,
        equity: "0.7",
        companyHandle: "c2",
      },
    ]);
  });

  test("works: with filter for has NO equity", async function () {
    let jobs = await Job.findAllWithFilter({ hasEquity: false });
    expect(jobs).toEqual([
      {
        id: 1,
        title: "j1",
        salary: 100000,
        equity: "0.5",
        companyHandle: "c1",
      },
      {
        id: 2,
        title: "j2",
        salary: 200000,
        equity: "0.7",
        companyHandle: "c2",
      },
      {
        id: 3,
        title: "j3",
        salary: 300000,
        equity: "0",
        companyHandle: "c1",
      },
    ]);
  });
});
/************************************** sqlForFiltering */
// TODO: make sqlForFiltering private method name _
describe("sqlForFiltering", function () {
  test("works where all fields passed in and has equity", function () {
    const dataToFilter = { titleLike: "2", minSalary: 100000, hasEquity: true };
    const sql = Job.sqlForFiltering(dataToFilter);

    expect(sql).toEqual({
      whereClause:
        "\nWHERE title ILIKE $1 AND salary >= $2 AND equity IS NOT NULL AND equity != 0",
      values: ["%2%", 100000],
    });
  });

  test("works for title and minSalary", function () {
    const dataToFilter = { titleLike: "2", minSalary: 100000 };
    const sql = Job.sqlForFiltering(dataToFilter);

    expect(sql).toEqual({
      whereClause: "\nWHERE title ILIKE $1 AND salary >= $2",
      values: ["%2%", 100000],
    });
  });

  test("return if data undefined", function () {
    let dataToFilter;
    expect(Job.sqlForFiltering(dataToFilter)).toEqual({
      whereClause: "",
      values: [],
    });
  });

  test("return if data empty", function () {
    const dataToFilter = {};
    expect(Job.sqlForFiltering(dataToFilter)).toEqual({
      whereClause: "",
      values: [],
    });
  });
});

/************************************** get */

describe("get", function () {
  test("works", async function () {
    let job = await Job.get(1);
    expect(job).toEqual({
      id: 1,
      title: "j1",
      salary: 100000,
      equity: "0.5",
      companyHandle: "c1",
    });
  });

  test("not found if no such job", async function () {
    try {
      await Job.get(999999999);
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
    salary: 500000,
    equity: 0.8,
  };

  test("works", async function () {
    let job = await Job.update(1, updateData);
    expect(job).toEqual({
      id: 1,
      title: "New",
      salary: 500000,
      equity: "0.8",
      companyHandle: "c1",
    });

    const result = await db.query(
      `SELECT id, title, salary, equity, company_handle
           FROM jobs
           WHERE id = 1`
    );
    expect(result.rows).toEqual([
      {
        id: 1,
        title: "New",
        salary: 500000,
        equity: "0.8",
        company_handle: "c1",
      },
    ]);
  });

  test("works: null fields", async function () {
    const updateDataSetNulls = {
      title: "New",
      salary: null,
      equity: null,
    };

    let job = await Job.update(1, updateDataSetNulls);
    expect(job).toEqual({
      id: 1,
      ...updateDataSetNulls,
      companyHandle: "c1",
    });

    const result = await db.query(
      `SELECT id, title, salary, equity, company_handle
           FROM jobs
           WHERE id = 1`
    );
    expect(result.rows).toEqual([
      {
        id: 1,
        title: "New",
        salary: null,
        equity: null,
        company_handle: "c1",
      },
    ]);
  });

  test("not found if no such job", async function () {
    try {
      await Job.update(999999999, updateData);
      throw new Error("fail test, you shouldn't get here");
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request with no data", async function () {
    try {
      await Job.update(1, {});
      throw new Error("fail test, you shouldn't get here");
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** remove */

describe("remove", function () {
  test("works", async function () {
    await Job.remove(1);
    const res = await db.query("SELECT id FROM jobs WHERE id=1");
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such job", async function () {
    try {
      await Job.remove(999999999);
      throw new Error("fail test, you shouldn't get here");
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("databse error if not valid SERIAL", async function () {
    try {
      await Job.remove("nope");
      throw new Error("fail test, you shouldn't get here");
    } catch (err) {
      console.log("err.constructor.name=", err.constructor.name);
      expect(err instanceof DatabaseError).toBeTruthy();
    }
  });
});
