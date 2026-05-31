import { useEffect, useState } from "react";
import Home from "./pages/Home";
import Cart from "./pages/Cart";
import Admin from "./pages/Admin";
import InfoPage from "./pages/InfoPage";

const CART_STORAGE_KEY = "bookshop-cart";
const VIEW_PATHS = {
  home: "/",
  cart: "/carrito",
  admin: "/admin",
  nosotros: "/nosotros",
  preguntas: "/preguntas",
  politicas: "/politicas",
  envios: "/envios",
  contacto: "/contacto",
};

function getViewFromPathname(pathname) {
  const entry = Object.entries(VIEW_PATHS).find(([, path]) => path === pathname);
  return entry?.[0] || "home";
}

function App() {
  const [currentView, setCurrentView] = useState(() => getViewFromPathname(window.location.pathname));
  const [homeSession, setHomeSession] = useState(0);
  const [cartItems, setCartItems] = useState(() => {
    try {
      const storedCart = localStorage.getItem(CART_STORAGE_KEY);
      return storedCart ? JSON.parse(storedCart) : [];
    } catch {
      localStorage.removeItem(CART_STORAGE_KEY);
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    function handlePopState() {
      setCurrentView(getViewFromPathname(window.location.pathname));
      setIsCartOpen(false);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function handleNavigate(view) {
    const nextPath = VIEW_PATHS[view] || VIEW_PATHS.home;
    window.history.pushState({}, "", nextPath);
    setCurrentView(view);
    setIsCartOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleHomeReset() {
    window.history.pushState({}, "", VIEW_PATHS.home);
    setCurrentView("home");
    setIsCartOpen(false);
    setHomeSession((currentValue) => currentValue + 1);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function addToCart(book) {
    setCartItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.id === book.id);

      if (existingItem) {
        return currentItems.map((item) =>
          item.id === book.id
            ? {
                ...item,
                quantity: Math.min(item.quantity + 1, book.stock || item.quantity + 1),
              }
            : item,
        );
      }

      return [
        ...currentItems,
        {
          ...book,
          quantity: 1,
        },
      ];
    });

    setIsCartOpen(true);
  }

  function updateCartItemQuantity(bookId, quantity) {
    if (quantity <= 0) {
      removeFromCart(bookId);
      return;
    }

    setCartItems((currentItems) =>
      currentItems.map((item) =>
        item.id === bookId
          ? {
              ...item,
              quantity: Math.min(quantity, item.stock || quantity),
            }
          : item,
      ),
    );
  }

  function removeFromCart(bookId) {
    setCartItems((currentItems) => currentItems.filter((item) => item.id !== bookId));
  }

  function clearCart() {
    setCartItems([]);
  }

  function handleOrderPlaced() {
    clearCart();
    handleHomeReset();
  }

  if (currentView === "cart") {
    return (
      <Cart
        cartItems={cartItems}
        onBack={() => handleNavigate("home")}
        onNavigate={handleNavigate}
        onUpdateQuantity={updateCartItemQuantity}
        onRemoveItem={removeFromCart}
        onClearCart={clearCart}
        onOrderPlaced={handleOrderPlaced}
      />
    );
  }

  if (currentView === "admin") {
    return <Admin onBack={() => handleNavigate("home")} />;
  }

  if (["nosotros", "preguntas", "politicas", "envios", "contacto"].includes(currentView)) {
    return (
      <InfoPage
        slug={currentView}
        cartItems={cartItems}
        onOpenCart={() => setIsCartOpen(true)}
        onNavigate={handleNavigate}
        onBrandReset={handleHomeReset}
        activeView={currentView}
      />
    );
  }

  return (
    <Home
      key={homeSession}
      cartItems={cartItems}
      isCartOpen={isCartOpen}
      onAddToCart={addToCart}
      onCloseCart={() => setIsCartOpen(false)}
      onOpenCart={() => setIsCartOpen(true)}
      onNavigate={handleNavigate}
      onBrandReset={handleHomeReset}
      activeView="home"
      onUpdateQuantity={updateCartItemQuantity}
      onRemoveItem={removeFromCart}
    />
  );
}

export default App;
