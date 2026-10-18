import Button from "./Button.tsx";
import googleIcon from "../../assets/gg-icon.svg"


const OAutGoogle = () => {

    const handleOAutGoogle = () => {
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
        window.location.href = `${apiUrl}/auth/google`;
    };

    return (
        <Button
            onClick={handleOAutGoogle}
            type="button"
            className="relative w-full justify-center gap-2 pl-10 pr-4 cursor-pointer font-medium border border-gray-300 px-4 py-2 rounded-lg"
        >
          <span
              className="pointer-events-none absolute left-4 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center [&_svg]:size-5"
              aria-hidden
          >
            <img
                src={googleIcon}
                alt="Google icon"
            />
          </span>
          <span>Continue with Google</span>
        </Button>
    );
};

export default OAutGoogle;