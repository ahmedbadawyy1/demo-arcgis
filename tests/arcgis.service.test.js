describe("arcgis service", () => {
  test("generates portal token when credentials are configured", async () => {
    jest.resetModules();
    jest.doMock("axios", () => ({
      post: jest.fn(),
      get: jest.fn(),
    }));
    process.env.ARCGIS_PORTAL_URL = "https://geoportal.strategizeit.us/arcgis";
    process.env.ARCGIS_USERNAME = "portaladmin";
    process.env.ARCGIS_PASSWORD = "test-password";

    const axios = require("axios");
    const { generatePortalToken } = require("../src/services/arcgis.service");

    axios.post.mockResolvedValueOnce({ data: { token: "abc123" } });
    const token = await generatePortalToken();

    expect(token).toBe("abc123");
    expect(axios.post).toHaveBeenCalled();
  });
});
