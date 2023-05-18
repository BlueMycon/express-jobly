"use strict";

const jwt = require("jsonwebtoken");
const { UnauthorizedError } = require("../expressError");
const {
  authenticateJWT,
  ensureLoggedIn,
  ensureCorrectUser,
  ensureIsAdmin,
  ensureCorrectUserOrIsAdmin,
} = require("./auth");

const { SECRET_KEY } = require("../config");
const testJwt = jwt.sign({ username: "test", isAdmin: false }, SECRET_KEY);
const badJwt = jwt.sign({ username: "test", isAdmin: false }, "wrong");

function next(err) {
  if (err) throw new Error("Got error from middleware");
}

describe("authenticateJWT", function () {
  test("works: via header", function () {
    const req = { headers: { authorization: `Bearer ${testJwt}` } };
    const res = { locals: {} };
    authenticateJWT(req, res, next);
    expect(res.locals).toEqual({
      user: {
        iat: expect.any(Number),
        username: "test",
        isAdmin: false,
      },
    });
  });

  test("works: no header", function () {
    const req = {};
    const res = { locals: {} };
    authenticateJWT(req, res, next);
    expect(res.locals).toEqual({});
  });

  test("works: invalid token", function () {
    const req = { headers: { authorization: `Bearer ${badJwt}` } };
    const res = { locals: {} };
    authenticateJWT(req, res, next);
    expect(res.locals).toEqual({});
  });
});

describe("ensureLoggedIn", function () {
  test("works", function () {
    const req = {};
    const res = { locals: { user: { username: "test" } } };
    ensureLoggedIn(req, res, next); //TODO: how do we know if this test is working?
  });

  test("unauth if no login", function () {
    const req = {};
    const res = { locals: {} };
    expect(() => ensureLoggedIn(req, res, next)).toThrow(UnauthorizedError);
  });

  test("unauth if no valid login", function () {
    const req = {};
    const res = { locals: { user: {} } };
    expect(() => ensureLoggedIn(req, res, next)).toThrow(UnauthorizedError);
  });
});

describe("ensureCorrectUser", function () {
  test("works", function () {
    const req = { params: { username: "test" } };
    const res = { locals: { user: { username: "test" } } };
    ensureCorrectUser(req, res, next); // TODO: how do we test if next() is called
    //TODO: test error isNotThrown (find matcher)
  });

  test("unauth not correct user", function () {
    const req = { params: { username: "test1" } };
    const res = { locals: { user: { username: "test2" } } };
    expect(() => ensureCorrectUser(req, res, next)).toThrow(UnauthorizedError);
  });

  test("unauth if no login", function () {
    const req = { params: { username: "test" } };
    const res = { locals: {} };
    expect(() => ensureLoggedIn(req, res, next)).toThrow(UnauthorizedError);
  });

  test("unauth if no valid login", function () {
    const req = { params: { username: "test" } };
    const res = { locals: { user: {} } };
    expect(() => ensureLoggedIn(req, res, next)).toThrow(UnauthorizedError);
  });
});

describe("ensureIsAdmin", function () {
  test("works", function () {
    const req = {};
    const res = { locals: { user: { username: "test", isAdmin: true } } };
    ensureIsAdmin(req, res, next);
  });

  test("unauth if not an admin", function () {
    const req = {};
    const res = { locals: { user: { username: "test", isAdmin: false } } };
    expect(() => ensureIsAdmin(req, res, next)).toThrow(UnauthorizedError);
  });

  test("unauth if no login", function () {
    const req = {};
    const res = { locals: {} };
    expect(() => ensureIsAdmin(req, res, next)).toThrow(UnauthorizedError);
  });

  test("unauth if no valid login", function () {
    const req = {};
    const res = { locals: { user: {} } };
    expect(() => ensureIsAdmin(req, res, next)).toThrow(UnauthorizedError);
  });
});

describe("ensureCorrectUserOrIsAdmin", function () {
  test("works for admin", function () {
    const req = {};
    const res = { locals: { user: { username: "test", isAdmin: true } } };
    ensureCorrectUserOrIsAdmin(req, res, next);
  });

  test("works for correct user who is not an admin", function () {
    const req = { params: { username: "test" } };
    const res = { locals: { user: { username: "test", isAdmin: false } } };
    ensureCorrectUserOrIsAdmin(req, res, next);
  });

  test("unauth for incorrect user and non-admin", function () {
    const req = { params: { username: "test1" } };
    const res = { locals: { user: { username: "test2", isAdmin: false } } };
    expect(() => ensureCorrectUserOrIsAdmin(req, res, next)).toThrow(
      UnauthorizedError
    );
  });

  test("unauth if no login", function () {
    const req = {};
    const res = { locals: {} };
    expect(() => ensureCorrectUserOrIsAdmin(req, res, next)).toThrow(
      UnauthorizedError
    );
  });

  test("unauth if no valid login", function () {
    const req = {};
    const res = { locals: { user: {} } };
    expect(() => ensureCorrectUserOrIsAdmin(req, res, next)).toThrow(
      UnauthorizedError
    );
  });
});
