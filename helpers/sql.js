"use strict";

const { BadRequestError } = require("../expressError");

/** SQL for Partial Update { dataToUpdate, jsToSql } =>  { setCols, values }
 *
 * dataToUpdate should be { firstName: 'Aliya', age: 32, ... }
 * jsToSql should be { colName: "col_name", ... }
 *
 * Returns { setCols, values  }
 * setCols should be '"first_name"=$1, "age"=$2'
 * values should be ['Aliya', 32, ...]
 *
 * Throws error if no data is sent to update
 */
function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map(
    (colName, idx) => `"${jsToSql[colName] || colName}"=$${idx + 1}`
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
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

function sqlForFiltering(dataToFilter) {
  if (!dataToFilter) return;
  // TODO: can we use jsToSql somehow??
  const keys = Object.keys(dataToFilter);
  if (keys.length === 0) return;

  // {nameLike: 'net', minEmployees: 200, maxEmployees; 800} => ['"name"=$1', '"num_employees"=$2']
  const cols = keys.map((colName, idx) => {
    if (colName === "nameLike") {
      console.log('dataToFilter["nameLike"] before', dataToFilter["nameLike"]);
      dataToFilter["nameLike"] = `%${dataToFilter["nameLike"]}%`;
      console.log("after", dataToFilter["nameLike"]);
      return `name ILIKE $${idx + 1}`;
    } else if (colName === "minEmployees") {
      return `num_employees >= $${idx + 1}`;
    } else if (colName === "maxEmployees") {
      return `num_employees <= $${idx + 1}`;
    }
  });

  return {
    whereClause: cols.join(" AND "),
    values: Object.values(dataToFilter),
  };
}

module.exports = { sqlForPartialUpdate, sqlForFiltering };
