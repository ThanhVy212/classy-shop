import {BrowserRouter, Route, Routes} from 'react-router-dom';
import UserLayout from "./components/Layout/UserLayout.tsx";
import AdminLayout from "./components/Layout/AdminLayout.tsx";

const App = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<UserLayout/>}>
                    {/*User Layout*/}
                </Route>
                <Route path="/admin" element={<AdminLayout />}>
                    {/*Admin Layout*/}
                </Route>
            </Routes>
        </BrowserRouter>
    )
}
export default App
