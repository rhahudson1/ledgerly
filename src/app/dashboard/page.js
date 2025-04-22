"use client";
import React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "../../../lib/firebase";
import { useAuth } from "../../../context/AuthContext";
import OrderForm from "../../../components/OrderForm";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { ArrowUpIcon, PlusIcon } from "@heroicons/react/24/solid";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [personName, setPersonName] = useState("");
  const [people, setPeople] = useState({});
  const [addingToOrderId, setAddingToOrderId] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editPayments, setEditPayments] = useState("");
  const [editExpense, setEditExpense] = useState("");

  const handleDeleteOrder = async (orderId) => {
    const db = getFirestore();
    await deleteDoc(doc(db, "users", user.uid, "orders", orderId));
    setOrders((prev) => prev.filter((order) => order.id !== orderId));
  };

  const handleUpdateOrder = async () => {
    if (!editingOrder) return;
    const db = getFirestore();
    const orderRef = doc(db, "users", user.uid, "orders", editingOrder.id);
    await updateDoc(orderRef, {
      paymentsReceived: parseFloat(editPayments),
      expense: parseFloat(editExpense),
    });
    setEditingOrder(null);
    setEditPayments("");
    setEditExpense("");
  };

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const db = getFirestore();
    const q = query(
      collection(db, "users", user.uid, "orders"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const newOrders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setOrders(newOrders);

      const allPeople = {};
      for (const order of newOrders) {
        const peopleSnapshot = await getDocs(collection(db, "users", user.uid, "orders", order.id, "people"));
        allPeople[order.id] = peopleSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      }
      setPeople(allPeople);
    });
    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/login");
  };

  const handleAddPerson = async (orderId) => {
    if (!personName.trim()) return;
    const db = getFirestore();
    const newPerson = {
      name: personName.trim(),
      paymentStatus: false,
    };
    const docRef = await addDoc(collection(db, "users", user.uid, "orders", orderId, "people"), newPerson);
    setPeople((prev) => ({
      ...prev,
      [orderId]: [...(prev[orderId] || []), { id: docRef.id, ...newPerson }],
    }));
    setPersonName("");
  };

  const togglePaymentStatus = async (orderId, personId) => {
    const db = getFirestore();
    const personList = people[orderId] || [];
    const personIndex = personList.findIndex((p) => p.id === personId);
    if (personIndex === -1) return;
    const updatedStatus = !personList[personIndex].paymentStatus;
    const docRef = doc(db, "users", user.uid, "orders", orderId, "people", personId);
    await updateDoc(docRef, { paymentStatus: updatedStatus });
    const updatedPeople = [...personList];
    updatedPeople[personIndex] = {
      ...updatedPeople[personIndex],
      paymentStatus: updatedStatus,
    };
    setPeople((prev) => ({ ...prev, [orderId]: updatedPeople }));
  };
  const handleDeletePerson = async (orderId, personId) => {
    const db = getFirestore();
    await deleteDoc(doc(db, "users", user.uid, "orders", orderId, "people", personId));
    setPeople((prev) => ({
      ...prev,
      [orderId]: prev[orderId].filter((p) => p.id !== personId),
    }));
  };
  
  const totalOrders = orders.length;
  const totalProfit = orders.reduce((sum, o) => {
    const payments = typeof o.paymentsReceived === "number" ? o.paymentsReceived : 0;
    const expense = typeof o.expense === "number" ? o.expense : 0;
    return sum + (payments - expense);
  }, 0);
  const pendingOrders = orders.filter(o => o.status !== "Completed").length;

  const getStatusBadge = (status) => {
    const colorMap = {
      "Awaiting Payment": "bg-red-100 text-red-800",
      "Awaiting Fulfillment": "bg-orange-100 text-orange-800",
      "Awaiting Approval": "bg-yellow-100 text-yellow-800",
      Completed: "bg-green-100 text-green-800",
    };
    
    return (
      <span
        className={`text-xs px-2 py-1 rounded-full font-medium ${
          colorMap[status] || "bg-gray-100 text-gray-800"
        }`}
      >
        {status || "Unknown"}
      </span>
    );
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-700 dark:text-gray-300">Loading…</p>
      </div>
    );
  }
  const EditOrderModal = () => {
    if (!editingOrder) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full relative">
      <button
        onClick={() => setEditingOrder(null)}
        className="absolute top-2 right-3 text-gray-400 hover:text-gray-700 dark:hover:text-white"
      >✕</button>
      <h3 className="text-lg font-semibold mb-6 text-gray-800 dark:text-gray-100">Edit Order</h3>
      <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-600 dark:text-gray-300">
          Order Name
        </label>
        <input
          type="text"
          className="mt-1 w-full p-3 text-base border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          value={editingOrder.name || ""}
          onChange={(e) =>
            setEditingOrder((prev) => ({ ...prev, name: e.target.value }))
          }
          placeholder="Enter order name"
        />
      </div>

        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-300">
            Payments Received
          </label>
          <input
            type="number"
            className="mt-1 w-full p-3 text-base border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            value={editPayments}
            onChange={(e) => setEditPayments(e.target.value)}
            placeholder="Enter amount"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-300">
            Expense
          </label>
          <input
            type="number"
            className="mt-1 w-full p-3 text-base border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            value={editExpense}
            onChange={(e) => setEditExpense(e.target.value)}
            placeholder="Enter amount"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
            Status
          </label>
          <select
            value={editingOrder.status || "Pending"}
            onChange={(e) =>
              setEditingOrder((prev) => ({ ...prev, status: e.target.value }))
            }
            className="w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="Awaiting Payment">Awaiting Payment</option>
            <option value="Awaiting Fulfillment">Awaiting Fulfillment</option>
            <option value="Awaiting Approval">Awaiting Approval</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
        <button
          onClick={async () => {
            if (!editingOrder) return;
            const db = getFirestore();
            const orderRef = doc(db, "users", user.uid, "orders", editingOrder.id);
            await updateDoc(orderRef, {
              name: editingOrder.name,
              paymentsReceived: parseFloat(editPayments) || 0,
              expense: parseFloat(editExpense) || 0,
              status: editingOrder.status,
            });            
            setEditingOrder(null);
            setEditPayments("");
            setEditExpense("");
          }}
          className="w-full mt-2 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Save Changes
        </button>
      </div>
    </div>
  </div>
    );
  };
  
  
  return (
    <div className="relative min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            {EditOrderModal()}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Orders</h1>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded"
          >
            Create Order
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
          >
            Log Out
          </button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full relative">
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-2 right-3 text-gray-400 hover:text-gray-700 dark:hover:text-white"
            >✕</button>
            <OrderForm onSuccess={() => setShowForm(false)} />
          </div>
        </div>
      )}
{addingToOrderId && (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md relative">
      <button
        onClick={() => setAddingToOrderId(null)}
        className="absolute top-2 right-3 text-gray-400 hover:text-gray-700 dark:hover:text-white"
      >✕</button>
      <h3 className="text-xl font-semibold mb-6 text-gray-800 dark:text-gray-100 text-center">
        Add Person to Order
      </h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAddPerson(addingToOrderId);
          setAddingToOrderId(null);
        }}
        className="space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
            Person Name
          </label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="e.g. John Doe"
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add Person
        </button>
      </form>
    </div>
  </div>
)}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[{ label: "Total Orders", value: totalOrders }, { label: "Total Profit", value: `$${totalProfit.toFixed(2)}` }, { label: "Pending Orders", value: pendingOrders }].map((card) => (
          <div key={card.label} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
<p className="text-base text-gray-500 dark:text-gray-400">{card.label}</p>
<div className="flex items-center justify-between mt-2">
<p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr className="border-b border-gray-200 dark:border-gray-600">
              {["Order Name", "Date", "Number of People", "Fulfillment", "Action"].map((h) => (
                <th key={h} className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <React.Fragment key={order.id}>
                <tr
                  className="cursor-pointer border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                  onClick={() => setExpandedOrderId((prev) => (prev === order.id ? null : order.id))}
                >
                  <td className="px-6 py-3 text-base text-gray-800 dark:text-gray-100">{order.name}</td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{order.createdAt?.toDate().toLocaleDateString()}</td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{people[order.id]?.length || 0}</td>
                  <td className="px-4 py-2 text-sm">{getStatusBadge(order.status || order.fulfillment)}</td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 space-x-2">
  <button
    className="hover:text-green-600"
    onClick={(e) => {
      e.stopPropagation();
      setAddingToOrderId(order.id);
    }}
  >
    <PlusIcon className="h-5 w-5 inline-block" />
  </button>
  <button
    className="hover:text-yellow-600"
    onClick={(e) => {
      e.stopPropagation();
      setEditingOrder(order);
      setEditPayments(order.paymentsReceived ?? "");
      setEditExpense(order.expense ?? "");
    }}
  >
    ✎
  </button>
  <button
    className="hover:text-red-600"
    onClick={(e) => {
      e.stopPropagation();
      handleDeleteOrder(order.id);
    }}
  >
    🗑️
  </button>
</td>

                </tr>
                {expandedOrderId === order.id && (
                  <tr key={`${order.id}-details`} className="border-b border-gray-100 dark:border-gray-700">
                  <td colSpan={5} className="px-6 py-6 bg-gray-100 dark:bg-gray-800 rounded-b-lg">
                
                      <div className="space-y-4">
                      {expandedOrderId &&
  orders
    .filter((order) => order.id === expandedOrderId)
    .map((order) => {
      const paymentsReceived = isNaN(order.paymentsReceived) ? 0 : order.paymentsReceived;
      const expense = isNaN(order.expense) ? 0 : order.expense;
      const profit = paymentsReceived - expense;


      return (
        <div key={order.id} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-700 p-6 rounded-xl shadow-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400">Payments Received</p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                {typeof paymentsReceived === "number" ? `$${paymentsReceived.toFixed(2)}` : "$0.00"}
              </p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-700 p-6 rounded-xl shadow-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400">Expense</p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                {typeof expense === "number" ? `$${expense.toFixed(2)}` : "$0.00"}
              </p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-700 p-6 rounded-xl shadow-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400">Profit</p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                {typeof profit === "number" ? `$${profit.toFixed(2)}` : "$0.00"}
              </p>
            </div>
          </div>
        </div>
      );
    })}

<div className="mt-4 overflow-hidden rounded-lg border dark:border-gray-700">
                          <table className="w-full text-sm text-left text-gray-700 dark:text-gray-200 border-collapse">
                          <thead className="text-xs bg-gray-100 dark:bg-gray-600">
  <tr>
    <th className="px-3 py-2">#</th>
    <th className="px-3 py-2">Name</th>
    <th className="px-3 py-2">Paid</th>
    <th className="px-3 py-2">Delete</th>

                              </tr>
                            </thead>
                            <tbody>
                              {(people[order.id] || []).map((person, index) => (
                                <tr key={person.id} className="border-t border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="px-4 py-3 text-base">{index + 1}</td>
                                <td className="px-3 py-2">{person.name}</td>
                                  <td className="px-3 py-2">
                                    <input
                                      type="checkbox"
                                      checked={person.paymentStatus}
                                      onChange={async () => {
                                        const db = getFirestore();
                                        const docRef = doc(db, "users", user.uid, "orders", order.id, "people", person.id);
                                        const updatedStatus = !person.paymentStatus;
                                        await updateDoc(docRef, { paymentStatus: updatedStatus });
                                        
                                        const updatedPeople = [...people[order.id]];
                                        const index = updatedPeople.findIndex((p) => p.id === person.id);
                                        if (index !== -1) {
                                          updatedPeople[index] = { ...updatedPeople[index], paymentStatus: updatedStatus };
                                          setPeople((prev) => ({ ...prev, [order.id]: updatedPeople }));
                                        }
                                                                              }}
                                      className="form-checkbox h-4 w-4 text-blue-600"
                                    />
                                  </td>
                                  <td className="px-3 py-2">
  <button
    onClick={() => handleDeletePerson(order.id, person.id)}
    className="text-red-500 hover:text-red-700"
  >
    🗑️
  </button>
</td>

                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}