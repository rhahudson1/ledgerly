"use client";

import { useState } from "react";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

export default function OrderForm({ onSuccess }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const db = getFirestore();
  const { user } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await addDoc(collection(db, "users", user.uid, "orders"), {
        name,
        createdAt: serverTimestamp(),
        people: Math.floor(Math.random() * 5) + 1,
        total: Math.floor(Math.random() * 100) + 20,
        status: "Awaiting Payment",
        expense: 0,
        paymentsRecieved: 0,
      });
      setName("");
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md w-full max-w-md"
    >
      <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">
        New Order
      </h3>
      <input
        type="text"
        placeholder="Order # or Name"
        className="w-full mb-3 p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        disabled={loading}
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition disabled:opacity-50"
      >
        {loading ? "Adding..." : "Add Order"}
      </button>
      {error && <p className="mt-2 text-red-500 text-sm">{error}</p>}
    </form>
  );
}