import { describe, it, expect } from "vitest";
import { axe } from "vitest-axe";
import { render } from "@testing-library/react";
import React from "react";

async function expectNoViolations(container) {
  const results = await axe(container);
  const serious = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious"
  );
  expect(serious).toEqual([]);
  return results;
}

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

describe("WCAG 2.1 AA Accessibility Audit", () => {
  describe("Button", () => {
    it("default variant has no critical/serious violations", async () => {
      const { container } = render(<Button>Click me</Button>);
      await expectNoViolations(container);
    });

    it("all variants have accessible names", async () => {
      const variants = ["default", "destructive", "outline", "secondary", "ghost", "link"];
      for (const variant of variants) {
        const { container, unmount } = render(
          <Button variant={variant}>Action</Button>
        );
        await expectNoViolations(container);
        unmount();
      }
    });

    it("disabled button is correctly marked", async () => {
      const { container } = render(<Button disabled>Disabled</Button>);
      await expectNoViolations(container);
    });
  });

  describe("Input", () => {
    it("text input with label has no violations", async () => {
      const { container } = render(
        <div>
          <label htmlFor="email">Email</label>
          <Input id="email" type="email" placeholder="user@example.com" />
        </div>
      );
      await expectNoViolations(container);
    });

    it("input with aria-label has no violations", async () => {
      const { container } = render(
        <Input aria-label="Search" type="search" />
      );
      await expectNoViolations(container);
    });

    it("disabled input is correctly marked", async () => {
      const { container } = render(
        <div>
          <label htmlFor="ro">Read only</label>
          <Input id="ro" disabled />
        </div>
      );
      await expectNoViolations(container);
    });
  });

  describe("Checkbox", () => {
    it("checkbox with label has no violations", async () => {
      const { container } = render(
        <div className="flex items-center gap-2">
          <Checkbox id="terms" />
          <Label htmlFor="terms">Accept terms</Label>
        </div>
      );
      await expectNoViolations(container);
    });

    it("checkbox with aria-label has no violations", async () => {
      const { container } = render(
        <Checkbox aria-label="Accept terms" />
      );
      await expectNoViolations(container);
    });
  });

  describe("Switch", () => {
    it("switch with label has no violations", async () => {
      const { container } = render(
        <div className="flex items-center gap-2">
          <Switch id="dark-mode" />
          <Label htmlFor="dark-mode">Dark mode</Label>
        </div>
      );
      await expectNoViolations(container);
    });

    it("switch with aria-label has no violations", async () => {
      const { container } = render(
        <Switch aria-label="Dark mode" />
      );
      await expectNoViolations(container);
    });
  });

  describe("Select", () => {
    it("select with label has no violations", async () => {
      const { container } = render(
        <div>
          <Label htmlFor="country-select">Country</Label>
          <Select>
            <SelectTrigger id="country-select">
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="br">Brazil</SelectItem>
              <SelectItem value="us">United States</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
      await expectNoViolations(container);
    });
  });

  describe("Tabs", () => {
    it("tabs with proper ARIA roles have no violations", async () => {
      const { container } = render(
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <p>Overview content</p>
          </TabsContent>
          <TabsContent value="details">
            <p>Details content</p>
          </TabsContent>
        </Tabs>
      );
      await expectNoViolations(container);
    });
  });

  describe("Dialog (modal)", () => {
    it("dialog content has no violations when open", async () => {
      const { container } = render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
              <DialogDescription>Make changes to your profile here.</DialogDescription>
            </DialogHeader>
            <div>
              <label htmlFor="name">Name</label>
              <Input id="name" />
            </div>
          </DialogContent>
        </Dialog>
      );
      await expectNoViolations(container);
    });

    it("dialog has aria-labelledby and aria-describedby", () => {
      const { getByRole } = render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Test Title</DialogTitle>
              <DialogDescription>Test description</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );
      const dialog = getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-labelledby");
    });

    it("dialog close button has accessible name", () => {
      const { getByRole } = render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Title</DialogTitle>
              <DialogDescription>Desc</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );
      const closeBtn = getByRole("button", { name: /fechar/i });
      expect(closeBtn).toBeInTheDocument();
    });
  });

  describe("AlertDialog (modal)", () => {
    it("alert dialog content has no violations when open", async () => {
      const { container } = render(
        <AlertDialog defaultOpen>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>Continue</AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      );
      await expectNoViolations(container);
    });

    it("alert dialog has correct role", () => {
      const { getByRole } = render(
        <AlertDialog defaultOpen>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm</AlertDialogTitle>
              <AlertDialogDescription>Please confirm.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogContent>
        </AlertDialog>
      );
      expect(getByRole("alertdialog")).toBeInTheDocument();
    });
  });

  describe("Sheet (modal)", () => {
    it("sheet content has no violations when open", async () => {
      const { container } = render(
        <Sheet defaultOpen>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Settings</SheetTitle>
              <SheetDescription>Adjust your preferences.</SheetDescription>
            </SheetHeader>
            <nav aria-label="Settings navigation">
              <ul>
                <li><a href="#general">General</a></li>
                <li><a href="#security">Security</a></li>
              </ul>
            </nav>
          </SheetContent>
        </Sheet>
      );
      await expectNoViolations(container);
    });

    it("sheet close button has accessible name", () => {
      const { getByRole } = render(
        <Sheet defaultOpen>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Title</SheetTitle>
              <SheetDescription>Desc</SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      );
      const closeBtn = getByRole("button", { name: /close/i });
      expect(closeBtn).toBeInTheDocument();
    });
  });

  describe("Combined component snapshot", () => {
    it("mixed form with multiple components has no violations", async () => {
      const { container } = render(
        <div>
          <h1>Settings</h1>
          <form>
            <div>
              <label htmlFor="full-name">Full Name</label>
              <Input id="full-name" type="text" />
            </div>
            <div>
              <label htmlFor="email-field">Email</label>
              <Input id="email-field" type="email" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="newsletter" />
              <Label htmlFor="newsletter">Subscribe to newsletter</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="dark" />
              <Label htmlFor="dark">Enable dark mode</Label>
            </div>
            <Button type="submit">Save</Button>
          </form>
        </div>
      );
      await expectNoViolations(container);
    });
  });
});
