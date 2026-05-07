import { Hono } from "hono";

export const homeRoute = new Hono().get("/", (c) => {
  return c.json({ message: "hello world", status: "ok" });
});
