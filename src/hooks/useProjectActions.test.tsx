import userEvent from "@testing-library/user-event";
import { useReducer, useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { PopupProvider } from "../components/ui";
import type { ResourceSelection } from "../context/UIContext";
import { composeReducer, initialState } from "./composeReducer";
import { useProjectActions } from "./useProjectActions";

const ProjectActionsHarness = ({ seeded = false }: { seeded?: boolean }) => {
    const [state, dispatch] = useReducer(composeReducer, {
        ...initialState,
        services: seeded ? { api: { image: "nginx" } } : {},
    });
    const [selected, setSelected] = useState<ResourceSelection | null>(
        seeded ? { type: "services", name: "api" } : null,
    );
    const [, setShowTemplates] = useState(false);
    const [resetCount, setResetCount] = useState(0);
    const resetProject = () => {
        dispatch({ type: "SET_STATE", payload: initialState });
        setResetCount((count) => count + 1);
    };
    const { handleAdd, handleDelete, handleClearAll } = useProjectActions(
        dispatch,
        selected,
        setSelected,
        setShowTemplates,
        resetProject,
    );

    return (
        <>
            <output aria-label="Services">{Object.keys(state.services).join(",")}</output>
            <output aria-label="Selection">{selected?.name ?? "none"}</output>
            <output aria-label="Reset count">{resetCount}</output>
            <button onClick={() => void handleAdd("services")}>Add service</button>
            <button onClick={() => void handleDelete("services", "api")}>Delete api</button>
            <button onClick={() => void handleClearAll()}>Clear all</button>
        </>
    );
};

const renderHarness = (seeded = false) =>
    render(
        <PopupProvider>
            <ProjectActionsHarness seeded={seeded} />
        </PopupProvider>,
    );

describe("useProjectActions", () => {
    it("adds and selects a resource after its naming popup is submitted", async () => {
        const user = userEvent.setup();
        renderHarness();

        await user.click(screen.getByRole("button", { name: "Add service" }));
        const dialog = screen.getByRole("dialog", { name: "Add service" });
        await user.type(within(dialog).getByRole("textbox", { name: "Service name" }), "  api  ");
        await user.click(within(dialog).getByRole("button", { name: "Add" }));

        await waitFor(() => {
            expect(screen.getByLabelText("Services")).toHaveTextContent("api");
            expect(screen.getByLabelText("Selection")).toHaveTextContent("api");
        });
    });

    it("leaves resources and selection unchanged when naming is cancelled", async () => {
        const user = userEvent.setup();
        renderHarness();

        await user.click(screen.getByRole("button", { name: "Add service" }));
        const dialog = screen.getByRole("dialog", { name: "Add service" });
        await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

        expect(screen.getByLabelText("Services")).toBeEmptyDOMElement();
        expect(screen.getByLabelText("Selection")).toHaveTextContent("none");
    });

    it("deletes a selected resource only after confirmation", async () => {
        const user = userEvent.setup();
        renderHarness(true);

        await user.click(screen.getByRole("button", { name: "Delete api" }));
        let dialog = screen.getByRole("dialog", { name: "Delete api?" });
        await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

        expect(screen.getByLabelText("Services")).toHaveTextContent("api");
        expect(screen.getByLabelText("Selection")).toHaveTextContent("api");

        await user.click(screen.getByRole("button", { name: "Delete api" }));
        dialog = screen.getByRole("dialog", { name: "Delete api?" });
        await user.click(within(dialog).getByRole("button", { name: "Delete" }));

        await waitFor(() => {
            expect(screen.getByLabelText("Services")).toBeEmptyDOMElement();
            expect(screen.getByLabelText("Selection")).toHaveTextContent("none");
        });
    });

    it("clears the project and selection only after confirmation", async () => {
        const user = userEvent.setup();
        renderHarness(true);

        await user.click(screen.getByRole("button", { name: "Clear all" }));
        let dialog = screen.getByRole("dialog", { name: "Clear all configuration?" });
        await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

        expect(screen.getByLabelText("Services")).toHaveTextContent("api");
        expect(screen.getByLabelText("Selection")).toHaveTextContent("api");
        expect(screen.getByLabelText("Reset count")).toHaveTextContent("0");

        await user.click(screen.getByRole("button", { name: "Clear all" }));
        dialog = screen.getByRole("dialog", { name: "Clear all configuration?" });
        await user.click(within(dialog).getByRole("button", { name: "Clear all" }));

        await waitFor(() => {
            expect(screen.getByLabelText("Services")).toBeEmptyDOMElement();
            expect(screen.getByLabelText("Selection")).toHaveTextContent("none");
            expect(screen.getByLabelText("Reset count")).toHaveTextContent("1");
        });
    });
});
