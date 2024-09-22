import React from "react";
import { Outlet, useNavigate } from "react-router-dom";
import axios from "axios";
import { useEffect } from "react";
import toast from "react-hot-toast";
import { useDispatch } from "react-redux";
import { logout, setUser } from "../redux/userSlice";
import Slider from "../Components/Slider";
import hello from "../assets/hellobw.png";
const Home = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const getUserData = async () => {
    //fetch data from API
    const url = `${process.env.REACT_APP_BACKEND_URL}/api/user-details`;
    try {
      const res = await axios({
        url,
        withCredentials: true,
      });
      console.log(res);
      if (res?.data.data.logout) {
        // console.log("hii");
        // toast.error(res?.data.data.message);
        dispatch(logout());
        navigate("/login");
        return;
      }
      // toast.success(res?.data?.message);
      dispatch(setUser(res?.data?.data));

      console.log("by");
    } catch (error) {
      toast.error(error?.response?.data?.message || "something went wrong");
    }
  };
  useEffect(() => {
    getUserData();
  }, []);

  return (
    <div className=" grid lg:grid-cols-[300px,1fr] h-screen max-h-screen">
      <section className=" bg-white">
        <Slider />
      </section>
      <section>
        <div className=" grid place-content-center h-full w-full">
          <img src={hello} className=" w-[500px]" alt="" />
        </div>
        {/* <Outlet></Outlet> */}
      </section>
    </div>
  );
};

export default Home;
