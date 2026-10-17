import {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";

const MyOrders = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<Order[]>([]);

    useEffect(() => {
        setTimeout(() => {
            const mockOrders = [
                {
                    _id: "12345",
                    createdAt: new Date().toISOString(),
                    shippingAddress: {city: "New York", country: "USA"},
                    orderItems: [
                        {
                            name: "Product 1",
                            image: "https://picsum.photos/200?random=1"
                        }
                    ],
                    totalPrice: 99,
                    isPaid: true,
                },
                {
                    _id: "313980",
                    createdAt: new Date().toISOString(),
                    shippingAddress: {city: "Santiago", country: "USA"},
                    orderItems: [
                        {
                            name: "Product 2",
                            image: "https://picsum.photos/200?random=2"
                        },
                        {
                            name: "Product 3",
                            image: "https://picsum.photos/200?random=3"
                        }
                    ],
                    totalPrice: 149,
                    isPaid: false,
                },
            ];

            setOrders(mockOrders);
        }, 1000);
    }, [])

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
            <h2 className="page-title mb-6">
                My Orders
            </h2>

            <div className="card-container">
                <table className="min-w-full text-left text-gray-500">
                    <thead className="table-head-row">
                        <tr>
                            <th className="py-3.5 px-4 sm:px-5">Image</th>
                            <th className="py-3.5 px-4 sm:px-5">Order ID</th>
                            <th className="py-3.5 px-4 sm:px-5">Created</th>
                            <th className="py-3.5 px-4 sm:px-5">
                                Shipping Address
                            </th>
                            <th className="py-3.5 px-4 sm:px-5">Items</th>
                            <th className="py-3.5 px-4 sm:px-5">Price</th>
                            <th className="py-3.5 px-4 sm:px-5">Status</th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                        {orders.length > 0 ? (
                            orders.map((order) => (
                                <tr
                                    key={order._id}
                                    onClick={() => navigate(`/order/${order._id}`)}
                                    className="table-row-hover cursor-pointer"
                                >
                                    <td className="py-3 px-4 sm:px-5">
                                        <img
                                            src={order.orderItems[0].image}
                                            alt={order.orderItems[0].name}
                                            className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded-lg"
                                        />
                                    </td>
                                    <td className="py-3 px-4 sm:px-5 font-semibold text-gray-900 whitespace-nowrap">
                                        #{order._id}
                                    </td>
                                    <td className="py-3 px-4 sm:px-5 text-sm">
                                        {new Date(order.createdAt).toLocaleDateString()}{" "}
                                        {new Date(order.createdAt).toLocaleTimeString()}
                                    </td>
                                    <td className="py-3 px-4 sm:px-5 text-sm">
                                        {order.shippingAddress
                                            ? `${order.shippingAddress.city}, ${order.shippingAddress.country}`
                                            : 'N/A'
                                        }
                                    </td>
                                    <td className="py-3 px-4 sm:px-5 text-sm">
                                        {order.orderItems.length}
                                    </td>
                                    <td className="py-3 px-4 sm:px-5 text-sm font-semibold text-gray-900">
                                        ${order.totalPrice}
                                    </td>
                                    <td className="py-3 px-4 sm:px-5">
                                        <span className={`status-badge ${
                                            order.isPaid ? "status-badge-success" : "status-badge-danger"
                                        }`}>
                                            {order.isPaid ? "Paid" : "Pending"}
                                        </span>
                                    </td>
                                </tr>
                            ))):(
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="py-4 px-4 text-center text-gray-500"
                                    >
                                        You have no orders.
                                    </td>
                                </tr>
                            )
                        }
                    </tbody>
                </table>
            </div>
        </div>
    )
};
export default MyOrders
