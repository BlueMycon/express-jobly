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

/**WHERE name ILIKE nameLike
          AND num_employees >= minEmployees
          AND num_employees <= maxEmployees */

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
