import { useState, useCallback, memo } from "react";
import { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table } from "lucide-react";

interface TableInsertProps {
  editor: Editor;
}

const TableInsert = memo(({ editor }: TableInsertProps) => {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [withHeader, setWithHeader] = useState(true);

  const handleInsert = useCallback(() => {
    editor
      .chain()
      .focus()
      .insertTable({
        rows: Math.max(1, Math.min(rows, 20)),
        cols: Math.max(1, Math.min(cols, 10)),
        withHeaderRow: withHeader,
      })
      .run();
    setOpen(false);
  }, [editor, rows, cols, withHeader]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <Table className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[340px]">
        <DialogHeader>
          <DialogTitle className="font-ui text-sm">Insert Table</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="rows" className="text-xs font-ui">
                Rows
              </Label>
              <Input
                id="rows"
                type="number"
                value={rows}
                onChange={(e) => setRows(parseInt(e.target.value, 10) || 1)}
                min={1}
                max={20}
                className="h-8 text-xs font-ui"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cols" className="text-xs font-ui">
                Columns
              </Label>
              <Input
                id="cols"
                type="number"
                value={cols}
                onChange={(e) => setCols(parseInt(e.target.value, 10) || 1)}
                min={1}
                max={10}
                className="h-8 text-xs font-ui"
              />
            </div>
          </div>

          {/* Preview grid */}
          <div className="border border-border/50 rounded-md p-3 bg-muted/30">
            <div className="text-[10px] font-ui text-muted-foreground mb-2">Preview</div>
            <div
              className="grid gap-0.5"
              style={{
                gridTemplateColumns: `repeat(${Math.min(cols, 10)}, 1fr)`,
              }}
            >
              {Array.from({ length: Math.min(rows, 8) * Math.min(cols, 10) }).map((_, i) => {
                const isHeader = withHeader && i < Math.min(cols, 10);
                return (
                  <div
                    key={i}
                    className={`h-4 rounded-sm ${isHeader ? "bg-primary/20" : "bg-muted/80"}`}
                  />
                );
              })}
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-ui cursor-pointer">
            <input
              type="checkbox"
              checked={withHeader}
              onChange={(e) => setWithHeader(e.target.checked)}
              className="rounded border-border"
            />
            Include header row
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" className="text-xs font-ui" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" className="text-xs font-ui" onClick={handleInsert}>
            Insert Table
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

TableInsert.displayName = "TableInsert";

export default TableInsert;
