import { useEffect, useState } from "react";
import Home from "./pages/Home";
import Cart from "./pages/Cart";
import Admin from "./pages/Admin";

const CART_STORAGE_KEY = "bookshop-cart";

function App() {
  const [currentView, setCurrentView] = useState("home");
  const [cartItems, setCartItems] = useState(() => {
    const storedCart = localStorage.getItem(CART_STORAGE_KEY);
    return storedCart ? JSON.parse(storedCart) : [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  function handleNavigate(view) {
    setCurrentView(view);
    setIsCartOpen(false);
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

  if (currentView === "cart") {
    return (
      <Cart
        cartItems={cartItems}
        onBack={() => handleNavigate("home")}
        onUpdateQuantity={updateCartItemQuantity}
        onRemoveItem={removeFromCart}
        onClearCart={clearCart}
      />
    );
  }

  if (currentView === "admin") {
    return <Admin onBack={() => handleNavigate("home")} />;
  }

  return (
    <Home
      cartItems={cartItems}
      isCartOpen={isCartOpen}
      onAddToCart={addToCart}
      onCloseCart={() => setIsCartOpen(false)}
      onOpenCart={() => setIsCartOpen(true)}
      onNavigate={handleNavigate}
      onUpdateQuantity={updateCartItemQuantity}
      onRemoveItem={removeFromCart}
    />
  );
}

export default App;
