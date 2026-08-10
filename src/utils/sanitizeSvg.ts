export const sanitizeSvg = (svgString: string): Element | null => {
    if (!svgString) return null;

    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, "image/svg+xml");
    if (doc.querySelector("parsererror")) return null;

    doc.querySelectorAll("script").forEach((node) => node.remove());

    doc.querySelectorAll("*").forEach((el) => {
        for (const attr of Array.from(el.attributes)) {
            const name = attr.name;
            const value = attr.value;
            if (/^on/i.test(name)) {
                el.removeAttribute(name);
                continue;
            }
            if ((name === "href" || name === "xlink:href") && /^\s*javascript:/i.test(value)) {
                el.removeAttribute(name);
            }
        }
    });

    return doc.documentElement;
};
