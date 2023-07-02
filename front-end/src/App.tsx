import { Provider } from "react-redux";
import MainInterface from "./modules/index";
import MainInterface2 from "./modules/index2";
import { store } from "./store";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
export const App = function () {
  return (
    <Provider store={store}>
      <Router>
        <Routes>
          <Route index element={<Navigate to="/system" />} />
          <Route path="/system" element={<MainInterface />} />
          <Route path="/baseline" element={<MainInterface2 />} />
        </Routes>
      </Router>
    </Provider>
  );
};
export default App;
