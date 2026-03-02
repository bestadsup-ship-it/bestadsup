import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Feed from './pages/Feed';
import Shop from './pages/Shop';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Explore from './pages/Explore';
import Following from './pages/Following';
import Friends from './pages/Friends';
import Live from './pages/Live';
import Messages from './pages/Messages';
import Activity from './pages/Activity';
import Upload from './pages/Upload';
import CreateService from './pages/CreateService';
import ServiceDetail from './pages/ServiceDetail';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Payment from './pages/Payment';
import Profile from './pages/Profile';
import Verification from './pages/Verification';
import Admin from './pages/Admin';
import { authAPI } from './api/client';

const PrivateRoute = ({ children }) => {
  return authAPI.isAuthenticated() ? children : <Navigate to="/login" />;
};

const PublicRoute = ({ children }) => {
  return !authAPI.isAuthenticated() ? children : <Navigate to="/shop" />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Shop />
            </PrivateRoute>
          }
        />
        <Route
          path="/shop"
          element={
            <PrivateRoute>
              <Shop />
            </PrivateRoute>
          }
        />
        <Route
          path="/cart"
          element={
            <PrivateRoute>
              <Cart />
            </PrivateRoute>
          }
        />
        <Route
          path="/checkout"
          element={
            <PrivateRoute>
              <Checkout />
            </PrivateRoute>
          }
        />
        <Route
          path="/explore"
          element={
            <PrivateRoute>
              <Explore />
            </PrivateRoute>
          }
        />
        <Route
          path="/following"
          element={
            <PrivateRoute>
              <Following />
            </PrivateRoute>
          }
        />
        <Route
          path="/friends"
          element={
            <PrivateRoute>
              <Friends />
            </PrivateRoute>
          }
        />
        <Route
          path="/live"
          element={
            <PrivateRoute>
              <Live />
            </PrivateRoute>
          }
        />
        <Route
          path="/messages"
          element={
            <PrivateRoute>
              <Messages />
            </PrivateRoute>
          }
        />
        <Route
          path="/activity"
          element={
            <PrivateRoute>
              <Activity />
            </PrivateRoute>
          }
        />
        <Route
          path="/upload"
          element={
            <PrivateRoute>
              <Upload />
            </PrivateRoute>
          }
        />
        <Route
          path="/services/create"
          element={
            <PrivateRoute>
              <CreateService />
            </PrivateRoute>
          }
        />
        <Route
          path="/services/:id"
          element={
            <PrivateRoute>
              <ServiceDetail />
            </PrivateRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <PrivateRoute>
              <Orders />
            </PrivateRoute>
          }
        />
        <Route
          path="/orders/:id"
          element={
            <PrivateRoute>
              <OrderDetail />
            </PrivateRoute>
          }
        />
        <Route
          path="/payment/:orderId"
          element={
            <PrivateRoute>
              <Payment />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />
        <Route
          path="/verification"
          element={
            <PrivateRoute>
              <Verification />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <PrivateRoute>
              <Admin />
            </PrivateRoute>
          }
        />
        <Route path="/feed" element={<Navigate to="/shop" />} />
        <Route path="*" element={<Navigate to="/shop" />} />
      </Routes>
    </Router>
  );
}

export default App;
