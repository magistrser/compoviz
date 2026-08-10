import { describe, expect, it } from "vitest";
import indexHtml from "../../index.html?raw";
import globalStyles from "../styles/global.scss?raw";

describe("application document", () => {
    it("does not load or initialize donation and advertising providers", () => {
        const runtimeMarkup = `${indexHtml}\n${globalStyles}`;

        expect(runtimeMarkup).not.toMatch(/ko-fi|kofiWidgetOverlay|donateButton|adsense|doubleclick|googleads/i);
    });
});
