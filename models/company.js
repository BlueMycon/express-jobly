"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
      `
        SELECT handle
        FROM companies
        WHERE handle = $1`,
      [handle]
    );

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
      `
                INSERT INTO companies (handle,
                                       name,
                                       description,
                                       num_employees,
                                       logo_url)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING
                    handle,
                    name,
                    description,
                    num_employees AS "numEmployees",
                    logo_url AS "logoUrl"`,
      [handle, name, description, numEmployees, logoUrl]
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies,
   * Can filter on (optional) provided search filters:
   * - minEmployees
   * - maxEmployees
   * - nameLike (will find case-insensitive, partial matches).
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

  static async findAllWithFilter(filterQuery) {
    const { whereClause, values } = Company.sqlForFiltering(filterQuery);

    const query =
      `
      SELECT handle,
            name,
            description,
            num_employees AS "numEmployees",
            logo_url      AS "logoUrl"
      FROM companies` +
      `${whereClause}` +
      `\nORDER BY name`;
    const companiesRes = await db.query(query, [...values]);
    return companiesRes.rows;
  }

  /** SQL for Filtering { dataToFilter } =>  { whereClause, values }
   *
   * dataToFilter could be { nameLike: 'net', minEmployees: 10, maxEmployees: 400 }
   *    all are optional; if not data passed in, function returns immediately;
   *
   * Returns { whereClause, values }:
   *
   * whereClause:
   *      name ILIKE $1
   *      AND num_employees >= $2
   *      AND num_employees <= $3
   * values:
   *      ['%net%', 10, 400]
   */
  static sqlForFiltering(dataToFilter) {
    if (!dataToFilter) return { whereClause: "", values: [] };
    const keys = Object.keys(dataToFilter);
    if (keys.length === 0) return { whereClause: "", values: [] };

    // {nameLike: 'net', minEmployees: 200, maxEmployees; 800} => ['"name"=$1', '"num_employees"=$2']
    const cols = keys.map((colName, idx) => {
      if (colName === "nameLike") {
        dataToFilter["nameLike"] = `%${dataToFilter["nameLike"]}%`;
        console.log("after", dataToFilter["nameLike"]);
        return `name ILIKE $${idx + 1}`;
      } else if (colName === "minEmployees") {
        return `num_employees >= $${idx + 1}`;
      } else if (colName === "maxEmployees") {
        return `num_employees <= $${idx + 1}`;
      }
    });

    const whereClause = cols.length > 0 ? "\nWHERE " + cols.join(" AND ") : "";

    return {
      whereClause,
      values: Object.values(dataToFilter),
    };
  }

  /** Given a company handle, return data about company.
   *
   * Return company { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await db.query(
      `
        SELECT handle,
               name,
               description,
               num_employees AS "numEmployees",
               logo_url      AS "logoUrl"
        FROM companies
        WHERE handle = $1`,
      [handle]
    );
    const company = companyRes.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    const jobsRes = await db.query(
      `
      SELECT id, title, salary, equity
      FROM jobs
      WHERE jobs.company_handle = $1`,
      [handle]
    );

    let jobs;
    if (!jobsRes.rows[0]) {
      jobs = [];
    } else {
      jobs = jobsRes.rows;
    }

    return { ...company, jobs };
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(data, {
      numEmployees: "num_employees",
      logoUrl: "logo_url",
    });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `
        UPDATE companies
        SET ${setCols}
        WHERE handle = ${handleVarIdx}
        RETURNING
            handle,
            name,
            description,
            num_employees AS "numEmployees",
            logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
      `
        DELETE
        FROM companies
        WHERE handle = $1
        RETURNING handle`,
      [handle]
    );
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}

module.exports = Company;
