/** LogixMitra brand mark */
import logo from "../../../public/assets/logo.jpeg"
import logo1 from "../../../public/assets/logo1.jpg"

const BrandLogo = ({
  compact = false,
  iconOnly = false,
  variant = "dark",
}: {
  compact?: boolean;
  iconOnly?: boolean;
  variant?: "dark" | "light";
}) => {
  const onDarkBg = variant === "light";

  const iconBox = (
      <img src={logo1}  style={{width:"70px",height:"40px"}} />
   
  );

  if (iconOnly || compact) {
    return iconBox;
  }

  return (
    <div className="flex items-center gap-2.5">
      <img src={logo}  style={{width:"140px",height:"80px"}} />
      
    </div>
  );
};

export default BrandLogo;
