"use strict";

/** Routes for companies. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureIsAdmin } = require("../middleware/auth");
const Company = require("../models/company");

const companyNewSchema = require("../schemas/companyNew.json");
const companyUpdateSchema = require("../schemas/companyUpdate.json");
const companyFilterSchema = require("../schemas/companyFilter");

const router = new express.Router();

/**Create a new company
 * POST / { company } =>  { company }
 *
 * company should be { handle, name, description, numEmployees, logoUrl }
 *
 * Returns { handle, name, description, numEmployees, logoUrl }
 *
 * Authorization required: admin
 */

router.post("/", ensureIsAdmin, async function (req, res, next) {
  // TODO: validate handle char length in jsonschema
  const validator = jsonschema.validate(req.body, companyNewSchema, {
    required: true,
  });
  if (!validator.valid) {
    const errs = validator.errors.map((e) => e.stack);
    throw new BadRequestError(errs);
  }

  const company = await Company.create(req.body);
  return res.status(201).json({ company });
});

/** Get info about all companies
 * GET /  =>
 *   { companies: [ { handle, name, description, numEmployees, logoUrl }, ...] }
 *
 * Can filter on provided search filters:
 * - minEmployees
 * - maxEmployees
 * - nameLike (will find case-insensitive, partial matches)
 *
 * Authorization required: none
 */

router.get("/", async function (req, res, next) {
  let minEmployees;
  let maxEmployees;
  let nameLike = req.query["nameLike"];

  if (req.query.minEmployees) {
    minEmployees = Number(req.query.minEmployees);
  }
  if (req.query.maxEmployees) {
    maxEmployees = Number(req.query.maxEmployees);
  }

  if (
    "minEmployees" in req.query &&
    "maxEmployees" in req.query &&
    req.query["minEmployees"] > req.query["maxEmployees"]
  ) {
    throw new BadRequestError();
  }

  const queryResp = { nameLike, minEmployees, maxEmployees };

  const result = jsonschema.validate(queryResp, companyFilterSchema, {
    required: true,
  });

  if (!result.valid) {
    // pass validation errors to error handler
    // (the "stack" key is generally the most useful)
    const errs = result.errors.map((err) => err.stack);
    throw new BadRequestError(errs);
  }

  const companies = await Company.findAllWithFilter(req.query);

  return res.json({ companies });
});

/**Get info about single company
 * GET /[handle]  =>  { company }
 *
 *  Company is { handle, name, description, numEmployees, logoUrl, jobs }
 *   where jobs is [{ id, title, salary, equity }, ...]
 *
 * Authorization required: none
 */

router.get("/:handle", async function (req, res, next) {
  const company = await Company.get(req.params.handle);
  return res.json({ company });
});

/** Update company info
 * PATCH /[handle] { fld1, fld2, ... } => { company }
 *
 * Patches company data.
 *
 * fields can be: { name, description, numEmployees, logo_url }
 *
 * Returns { handle, name, description, numEmployees, logo_url }
 *
 * Authorization required: admin
 */

router.patch("/:handle", ensureIsAdmin, async function (req, res, next) {
  const validator = jsonschema.validate(
    req.body,
    companyUpdateSchema, {
    required: true,
  });
  if (!validator.valid) {
    const errs = validator.errors.map((e) => e.stack);
    throw new BadRequestError(errs);
  }

  const company = await Company.update(req.params.handle, req.body);
  return res.json({ company });
});

/**Delete a company
 * DELETE /[handle]  =>  { deleted: handle }
 *
 * Authorization required: admin
 */

router.delete("/:handle", ensureIsAdmin, async function (req, res, next) {
  await Company.remove(req.params.handle);
  return res.json({ deleted: req.params.handle });
});

module.exports = router;
