import { useEffect, useState } from "react";
import Home from "./pages/Home";
import Cart from "./pages/Cart";
import Admin from "./pages/Admin";
import InfoPage from "./pages/InfoPage";
import Blog from "./pages/Blog";
import WhatsAppFloat from "./components/WhatsAppFloat";

const CART_STORAGE_KEY = "bookshop-cart";
const VIEW_PATHS = {
  home: "/",
  cart: "/carrito",
  admin: "/admin",
  blog: "/blog",
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

  function addToCart(selectedBooks) {
    const booksToAdd = (Array.isArray(selectedBooks) ? selectedBooks : [selectedBooks]).filter(Boolean);

    setCartItems((currentItems) => {
      return booksToAdd.reduce((items, book) => {
        const existingItem = items.find((item) => item.id === book.id);

        if (existingItem) {
          return items.map((item) =>
            item.id === book.id
              ? {
                  ...item,
                  quantity: Math.min(item.quantity + 1, book.stock || item.quantity + 1),
                }
              : item,
          );
        }

        return [
          ...items,
          {
            ...book,
            quantity: 1,
          },
        ];
      }, currentItems);
    });

    setIsCartOpen(true);
  }

  function updateCartItemQuantity(bookId, quantity) {
    if (quantity <= 0) {
      removeFromCart(bookId);
      return;
    }

    setCartItems((currentItems) => {
      const selectedItem = currentItems.find((item) => item.id === bookId);
      const partnerItem = selectedItem?.promo_2x1_partner_id
        ? currentItems.find((item) => Number(item.id) === Number(selectedItem.promo_2x1_partner_id))
        : null;
      const safeQuantity = Math.min(
        quantity,
        selectedItem?.stock || quantity,
        partnerItem?.stock || quantity,
      );

      return currentItems.map((item) =>
        item.id === bookId || (partnerItem && item.id === partnerItem.id)
          ? {
              ...item,
              quantity: safeQuantity,
            }
          : item,
      );
    });
  }

  function removeFromCart(bookId) {
    setCartItems((currentItems) => {
      const selectedItem = currentItems.find((item) => item.id === bookId);
      const partnerId = selectedItem?.promo_2x1_partner_id;

      if (!partnerId) {
        return currentItems.filter((item) => item.id !== bookId);
      }

      return currentItems.filter(
        (item) => item.id !== bookId && Number(item.id) !== Number(partnerId),
      );
    });
  }

  function clearCart() {
    setCartItems([]);
  }

  function handleOrderPlaced() {
    clearCart();
    handleHomeReset();
  }

  function renderPublicPage(page) {
    return (
      <>
        {page}
        <WhatsAppFloat />
      </>
    );
  }

  if (currentView === "cart") {
    return renderPublicPage(
      <Cart
        cartItems={cartItems}
        onBack={() => handleNavigate("home")}
        onNavigate={handleNavigate}
        onUpdateQuantity={updateCartItemQuantity}
        onRemoveItem={removeFromCart}
        onClearCart={clearCart}
        onOrderPlaced={handleOrderPlaced}
      />,
    );
  }

  if (currentView === "admin") {
    return <Admin onBack={() => handleNavigate("home")} />;
  }

  if (currentView === "blog") {
    return renderPublicPage(
      <Blog
        cartItems={cartItems}
        onOpenCart={() => setIsCartOpen(true)}
        onNavigate={handleNavigate}
        onBrandReset={handleHomeReset}
      />,
    );
  }

  if (["nosotros", "preguntas", "politicas", "envios", "contacto"].includes(currentView)) {
    return renderPublicPage(
      <InfoPage
        slug={currentView}
        cartItems={cartItems}
        onOpenCart={() => setIsCartOpen(true)}
        onNavigate={handleNavigate}
        onBrandReset={handleHomeReset}
        activeView={currentView}
      />,
    );
  }

  return renderPublicPage(
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
    />,
  );
}

export default App;
