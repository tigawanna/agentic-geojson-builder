import { SearchBox } from "@/components/search/SearchBox";
import { Button } from "@/components/ui/button";
import { useDebouncer } from "@tanstack/react-pacer";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Route } from "..";

interface MapsListScafolldProps {
  children: React.ReactNode;
  showPagination: boolean;
  nextCursor?: string | undefined;
  previousCursor?: string | undefined;
}

export function MapsListScafolld({
  children,
  showPagination,
  nextCursor,
  previousCursor,
}: MapsListScafolldProps) {
  const { sq = "" } = Route.useSearch();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState(sq);

  const debouncer = useDebouncer(
    (value: string) => {
      void navigate({
        to: ".",
        search: (prev: Record<string, unknown>) => ({
          ...prev,
          sq: value || undefined,
          cursor: undefined,
          dir: undefined,
        }),
        replace: true,
      });
    },
    { wait: 500 },
    (state) => ({ isPending: state.isPending }),
  );

  const handleKeywordChange: React.Dispatch<React.SetStateAction<string>> = (action) => {
    setKeyword((prev) => {
      const next = typeof action === "function" ? action(prev) : action;
      debouncer.maybeExecute(next);
      return next;
    });
  };
  function goNext() {
    void navigate({
      to: ".",
      search: (prev) => ({ ...prev, cursor: nextCursor, dir: "after" as const }),
    });
  }

  function goPrevious() {
    void navigate({
      to: ".",
      search: (prev) => ({ ...prev, cursor: previousCursor, dir: "before" as const }),
    });
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <div className="w-full flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Maps</h1>
        <SearchBox
          keyword={keyword}
          setKeyword={handleKeywordChange}
          debouncedValue={sq}
          isDebouncing={debouncer.state.isPending ?? false}
          inputProps={{ placeholder: "Search maps..." }}
        />
        <Button variant="outline" asChild>
          <Link to="/maps/new">Create Map</Link>
        </Button>
      </div>
      {children}
      {showPagination ? (
        <div className="flex items-center justify-between border-t pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={goPrevious}
            disabled={!previousCursor}
            data-test="pagination-prev"
          >
            <ChevronLeft className="mr-1 size-4" /> Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goNext}
            disabled={!nextCursor}
            data-test="pagination-next"
          >
            Next <ChevronRight className="ml-1 size-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
