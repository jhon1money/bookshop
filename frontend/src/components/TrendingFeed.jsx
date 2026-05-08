import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import TrendControls from "./TrendControls";
import TrendSlide from "./TrendSlide";
import { useTrendingBooks } from "../hooks/useTrendingBooks";

const RECENT_TRENDING_STORAGE_KEY = "bookshop-recent-trending";

function TrendingFeed() {
  const { books, loading, error } = useTrendingBooks();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState("next");

  const feedRef = useRef(null);
  const touchStartYRef = useRef(null);
  const navigationLockRef = useRef(false);

  useEffect(() => {
    if (!books.length) {
      return;
    }

    const currentBook = books[currentIndex];
    try {
      const currentItems = JSON.parse(localStorage.getItem(RECENT_TRENDING_STORAGE_KEY) || "[]");
      const nextItems = [currentBook.id, ...currentItems.filter((item) => item !== currentBook.id)].slice(0, 8);
      localStorage.setItem(RECENT_TRENDING_STORAGE_KEY, JSON.stringify(nextItems));
    } catch {
      localStorage.setItem(RECENT_TRENDING_STORAGE_KEY, JSON.stringify([currentBook.id]));
    }

    const nextBook = books[(currentIndex + 1) % books.length];
    if (nextBook?.cover) {
      const image = new Image();
      image.src = nextBook.cover;
    }
  }, [books, currentIndex]);

  const changeBook = useCallback(
    (step) => {
      if (!books.length) {
        return;
      }

      startTransition(() => {
        setDirection(step > 0 ? "next" : "prev");
        setCurrentIndex((currentValue) => {
          const nextIndex = currentValue + step;

          if (nextIndex < 0) {
            return books.length - 1;
          }

          if (nextIndex >= books.length) {
            return 0;
          }

          return nextIndex;
        });
      });
    },
    [books],
  );

  const guardedChange = useCallback(
    (step) => {
      if (navigationLockRef.current) {
        return;
      }

      navigationLockRef.current = true;
      changeBook(step);

      window.setTimeout(() => {
        navigationLockRef.current = false;
      }, 420);
    },
    [changeBook],
  );

  useEffect(() => {
    const node = feedRef.current;

    if (!node) {
      return undefined;
    }

    function handleWheel(event) {
      if (Math.abs(event.deltaY) < 32) {
        return;
      }

      event.preventDefault();
      guardedChange(event.deltaY > 0 ? 1 : -1);
    }

    node.addEventListener("wheel", handleWheel, { passive: false });
    return () => node.removeEventListener("wheel", handleWheel);
  }, [guardedChange]);

  const currentBook = books[currentIndex];

  return (
    <aside
      className="trend-feed-shell"
      ref={feedRef}
      onTouchStart={(event) => {
        touchStartYRef.current = event.touches[0]?.clientY ?? null;
      }}
      onTouchEnd={(event) => {
        if (touchStartYRef.current === null) {
          return;
        }

        const endY = event.changedTouches[0]?.clientY ?? touchStartYRef.current;
        const deltaY = endY - touchStartYRef.current;

        if (Math.abs(deltaY) > 52) {
          guardedChange(deltaY < 0 ? 1 : -1);
        }

        touchStartYRef.current = null;
      }}
    >
      <div className="trend-feed-header">
        <p className="section-label">Tendencias impresas</p>
        <span className="trend-feed-source">Ranking global</span>
      </div>

      {loading ? <p className="status-box">Cargando libros en tendencia...</p> : null}
      {error ? <p className="status-box error-box">{error}</p> : null}

      {!loading && !error && currentBook ? (
        <div className="trend-stage">
          <TrendSlide key={currentBook.id} book={currentBook} direction={direction} />
          <TrendControls
            currentIndex={currentIndex}
            total={books.length}
            onPrevious={() => guardedChange(-1)}
            onNext={() => guardedChange(1)}
          />
        </div>
      ) : null}
    </aside>
  );
}

export default TrendingFeed;
