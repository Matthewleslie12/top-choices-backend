// import jwt from "jsonwebtoken";

// const jwtSecret = process.env.JWT_SECRET || "ngjisdbiugrewmsopg,merwposg";

// const checkAuth = (req, res, next) => {
//   const token = req.cookies.token;

//   if (!token) {
//     return res.status(401).json({error: "Unauthorized"});
//   }

//   jwt.verify(token, jwtSecret, (err, decoded) => {
//     if (err) {
//       return res.status(401).json({error: "Unauthorized"});
//     }
//     req.user = decoded;

//     if (req.path === "/login" || req.path === "/register") {
//       return next();
//     }
//     return res.status(403).json({error: "Forbidden"});
//   });
// };

// export default checkAuth;
