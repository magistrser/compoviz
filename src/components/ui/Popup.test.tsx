import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { PopupProvider, usePopup } from "./Popup";

const PopupHarness = () => {
    const popup = usePopup();
    const [result, setResult] = useState("idle");

    const requestName = async () => {
        const name = await popup.requestText({
            title: "Add service",
            description: "Choose a name for the new service.",
            label: "Service name",
            confirmLabel: "Add",
        });
        setResult(name ?? "cancelled");
    };

    const requestDelete = async () => {
        const confirmed = await popup.requestConfirmation({
            title: "Delete api?",
            description: "This action cannot be undone.",
            confirmLabel: "Delete",
            tone: "danger",
        });
        setResult(confirmed ? "confirmed" : "cancelled");
    };

    return (
        <>
            <button onClick={() => void requestName()}>Add service</button>
            <button onClick={() => void requestDelete()}>Delete resource</button>
            <output aria-label="Popup result">{result}</output>
        </>
    );
};

const PopupPromiseProbe = ({ onRequest }: { onRequest: (request: Promise<string | null>) => void }) => {
    const popup = usePopup();

    return (
        <button
            onClick={() =>
                onRequest(
                    popup.requestText({
                        title: "Add network",
                        label: "Network name",
                    }),
                )
            }
        >
            Add network
        </button>
    );
};

describe("PopupProvider", () => {
    it("submits a trimmed resource name and restores focus", async () => {
        const user = userEvent.setup();
        render(
            <PopupProvider>
                <PopupHarness />
            </PopupProvider>,
        );

        const trigger = screen.getByRole("button", { name: "Add service" });
        await user.click(trigger);

        const dialog = screen.getByRole("dialog", { name: "Add service" });
        const nameInput = within(dialog).getByRole("textbox", { name: "Service name" });
        const addButton = within(dialog).getByRole("button", { name: "Add" });

        expect(nameInput).toHaveFocus();
        expect(addButton).toBeDisabled();

        await user.type(nameInput, "  api  ");
        expect(addButton).toBeEnabled();
        await user.click(addButton);

        await waitFor(() => expect(screen.getByLabelText("Popup result")).toHaveTextContent("api"));
        expect(trigger).toHaveFocus();
    });

    it("requires explicit confirmation for a destructive action", async () => {
        const user = userEvent.setup();
        render(
            <PopupProvider>
                <PopupHarness />
            </PopupProvider>,
        );

        await user.click(screen.getByRole("button", { name: "Delete resource" }));

        const dialog = screen.getByRole("dialog", { name: "Delete api?" });
        expect(within(dialog).getByText("This action cannot be undone.")).toBeInTheDocument();
        expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();

        await user.click(within(dialog).getByRole("button", { name: "Delete" }));

        await waitFor(() => expect(screen.getByLabelText("Popup result")).toHaveTextContent("confirmed"));
    });

    it("cancels with Escape and restores focus", async () => {
        const user = userEvent.setup();
        render(
            <PopupProvider>
                <PopupHarness />
            </PopupProvider>,
        );

        const trigger = screen.getByRole("button", { name: "Add service" });
        await user.click(trigger);
        expect(screen.getByRole("dialog", { name: "Add service" })).toBeInTheDocument();

        await user.keyboard("{Escape}");

        await waitFor(() => expect(screen.getByLabelText("Popup result")).toHaveTextContent("cancelled"));
        expect(screen.queryByRole("dialog", { name: "Add service" })).not.toBeInTheDocument();
        expect(trigger).toHaveFocus();
    });

    it("cancels when the backdrop is clicked", async () => {
        const user = userEvent.setup();
        render(
            <PopupProvider>
                <PopupHarness />
            </PopupProvider>,
        );

        const trigger = screen.getByRole("button", { name: "Delete resource" });
        await user.click(trigger);
        const dialog = screen.getByRole("dialog", { name: "Delete api?" });
        const backdrop = dialog.parentElement;
        expect(backdrop).not.toBeNull();

        await user.click(backdrop!);

        await waitFor(() => expect(screen.getByLabelText("Popup result")).toHaveTextContent("cancelled"));
        expect(screen.queryByRole("dialog", { name: "Delete api?" })).not.toBeInTheDocument();
        expect(trigger).toHaveFocus();
    });

    it("keeps Tab navigation inside the popup", async () => {
        const user = userEvent.setup();
        render(
            <PopupProvider>
                <PopupHarness />
            </PopupProvider>,
        );

        await user.click(screen.getByRole("button", { name: "Delete resource" }));
        const dialog = screen.getByRole("dialog", { name: "Delete api?" });
        const cancelButton = within(dialog).getByRole("button", { name: "Cancel" });
        const deleteButton = within(dialog).getByRole("button", { name: "Delete" });

        expect(cancelButton).toHaveFocus();
        await user.tab({ shift: true });
        expect(deleteButton).toHaveFocus();
        await user.tab();
        expect(cancelButton).toHaveFocus();
    });

    it("settles an active request as cancelled when the provider unmounts", async () => {
        const user = userEvent.setup();
        const onSettled = vi.fn();
        const view = render(
            <PopupProvider>
                <PopupPromiseProbe onRequest={(request) => void request.then(onSettled)} />
            </PopupProvider>,
        );

        await user.click(screen.getByRole("button", { name: "Add network" }));
        expect(screen.getByRole("dialog", { name: "Add network" })).toBeInTheDocument();

        view.unmount();

        await waitFor(() => expect(onSettled).toHaveBeenCalledWith(null));
    });
});
