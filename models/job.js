"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");
const Company = require("./company");

/** Related functions for jobs. */
/* id, title, salary, equity, company_handle */

class Job {
  /** Create a job (from data), update db, return new job data.
   *
   * data should be { id, title, salary, equity, companyHandle }
   *
   * Returns { id, title, salary, equity, companyHandle }
   *
   * Throws BadRequestError if company handle has no reference.
   * */

  static async create({ title, salary, equity, companyHandle }) {
    // check for invalid company handle
    try {
      await Company.get(companyHandle);
    } catch (err) {
      throw err;
    }

    const result = await db.query(
      `
        INSERT INTO jobs (title, salary, equity, company_handle)
        VALUES ($1, $2, $3, $4)
        RETURNING
          id, title, salary, equity, company_handle AS "companyHandle"`,
      [title, salary, equity, companyHandle]
    );
    const job = result.rows[0];

    return job;
  }

  /** Find all jobs,
   * Can filter on (optional) provided search filters:
   * - titleLike (will find case-insensitive, partial matches)
   * - minSalary
   * - hasEquity (boolean, if not given acts as if false)
   *
   * Returns [{ id, title, salary, equity, companyHandle }, ...]
   * */

  static async findAllWithFilter(filterQuery) {
    const { whereClause, values } = Job.sqlForFiltering(filterQuery);
    const query =
      `
      SELECT id, title, salary, equity, company_handle AS "companyHandle"
      FROM jobs` +
      `${whereClause}` + `\nORDER BY id`;
    const jobsRes = await db.query(query, [...values]);
    return jobsRes.rows;
  }

  /** SQL for Filtering { dataToFilter } =>  { whereClause, values }
   *
   * dataToFilter could be { title: 'boss', minSalary: 1000000, hasEquity: true }
   *    all are optional; if no data passed in, function returns empty values //TODO: fix this in other sqlForFiltering
   *
   * Returns { whereClause, values }:
   *
   * whereClause:
   *      title ILIKE $1
   *      AND salary >= $2
   *      AND equity IS NOT NULL AND equity != 0
   * values:
   *      ['%boss%', 1000000]
   */
  static sqlForFiltering(dataToFilter) {
    if (!dataToFilter) return { whereClause: "", values: [] };
    if (dataToFilter.hasEquity === false) delete dataToFilter.hasEquity;
    const keys = Object.keys(dataToFilter);
    if (keys.length === 0) return { whereClause: "", values: [] };

    // TODO: fix comment below here and in other sqlForFiltering
    // {title: 'boss', minSalary: 1000000, hasEquity: true} => ['"title" ILIKE $1', '"salary" >= $2', '"has_equity" = $3']
    const cols = keys.map((colName, idx) => {
      if (colName === "titleLike") {
        dataToFilter.titleLike = `%${dataToFilter.titleLike}%`;
        return `title ILIKE $${idx + 1}`;
      } else if (colName === "minSalary") {
        return `salary >= $${idx + 1}`;
      } else if (colName === "hasEquity" && dataToFilter.hasEquity === true) {
        return `equity IS NOT NULL AND equity != 0`;
      }
    });

    const whereClause = cols.length > 0 ? "\nWHERE " + cols.join(" AND ") : "";
    delete dataToFilter.hasEquity;

    return {
      whereClause,
      values: Object.values(dataToFilter),
    };
  }

  /** Given a job id, return data about job.
   *
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(id) {
    const jobRes = await db.query(
      `
        SELECT id, title, salary, equity, company_handle AS "companyHandle"
        FROM jobs
        WHERE id = $1`,
      [id]
    );

    const job = jobRes.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);

    return job;
  }

  /** Update job data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: { title, salary, equity }
   *
   * Returns { id, title, salary, equity, companyHandle }
   *
   * Throws NotFoundError if not found.
   */

  static async update(id, data) {
    const { setCols, values } = sqlForPartialUpdate(data, {});
    const idVarIdx = "$" + (values.length + 1);

    const querySql = `
        UPDATE jobs
        SET ${setCols}
        WHERE id = ${idVarIdx}
        RETURNING
        id, title, salary, equity, company_handle AS "companyHandle"`;
    const result = await db.query(querySql, [...values, id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);

    return job;
  }

  /** Delete given job from database; returns undefined.
   *
   * Throws NotFoundError if job not found.
   **/

  static async remove(id) {
    const result = await db.query(
      `
        DELETE
        FROM jobs
        WHERE id = $1
        RETURNING id`,
      [id]
    );
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);
  }
}

module.exports = Job;
