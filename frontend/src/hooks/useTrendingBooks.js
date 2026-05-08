import { useEffect, useState } from "react";
import { getTrendingBooks } from "../services/api";

const CACHE_KEY = "bookshop-trending-cache-v3";
const CACHE_TTL = 1000 * 60 * 60 * 6;

function truncateText(text, maxLength = 150) {
  if (!text) {
    return "";
  }

  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > CACHE_TTL) {
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      }),
    );
  } catch {
    return;
  }
}

function normalizeBooks(books) {
  return books.map((book) => ({
    ...book,
    description: truncateText(book.description),
  }));
}

export function useTrendingBooks() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function refreshTrending() {
      try {
        const data = await getTrendingBooks();
        const normalized = normalizeBooks(data);

        if (isMounted) {
          setBooks(normalized);
          writeCache(normalized);
        }
      } catch {
        if (isMounted) {
          setError("No se pudieron cargar las tendencias");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    const cached = readCache();
    if (cached && isMounted) {
      setBooks(cached);
      setLoading(false);
      refreshTrending();
    } else {
      refreshTrending();
    }

    return () => {
      isMounted = false;
    };
  }, []);

  return { books, loading, error };
}
