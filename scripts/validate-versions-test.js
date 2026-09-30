"use strict";

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const test = require("node:test");

const sourceManifest = ".claude-plugin/plugin.json";
const manifestPaths = [
  ".claude-plugin/marketplace.json",
];

function readManifestVersion(manifestPath) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  return manifest.version ?? manifest.plugins?.[0]?.version;
}

test("all plugin manifests use the .claude-plugin/plugin.json version", () => {
  const expectedVersion = readManifestVersion(sourceManifest);
  assert.ok(expectedVersion, `${sourceManifest} must define a version`);

  for (const manifestPath of manifestPaths) {
    assert.equal(
      readManifestVersion(manifestPath),
      expectedVersion,
      `${manifestPath} must use version ${expectedVersion}`,
    );
  }
});
