import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  type User as FirebaseUser,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  query,
  collection,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { User } from "@/types";

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    username: string,
    firstName?: string,
    lastName?: string,
    birthday?: Date
  ) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  checkUsernameAvailable: (username: string) => Promise<boolean>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (uid: string) => {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      setUser({ id: userDoc.id, ...userDoc.data() } as User);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      if (firebaseUser) {
        await fetchUserData(firebaseUser.uid);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const checkUsernameAvailable = async (username: string): Promise<boolean> => {
    const usernameQuery = query(
      collection(db, "users"),
      where("username", "==", username.toLowerCase())
    );
    const snapshot = await getDocs(usernameQuery);
    return snapshot.empty;
  };

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (
    email: string,
    password: string,
    username: string,
    firstName?: string,
    lastName?: string,
    birthday?: Date
  ) => {
    // Check username availability
    const isAvailable = await checkUsernameAvailable(username);
    if (!isAvailable) {
      throw new Error("Username is already taken");
    }

    // Create user in Firebase Auth
    const { user: newUser } = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Create document in Firestore
    const userData: Omit<User, "id"> = {
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      birthday: birthday
        ? (birthday as unknown as import("firebase/firestore").Timestamp)
        : undefined,
      createdAt: serverTimestamp() as import("firebase/firestore").Timestamp,
    };

    await setDoc(doc(db, "users", newUser.uid), userData);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const refreshUser = async () => {
    if (firebaseUser) {
      await fetchUserData(firebaseUser.uid);
    }
  };

  const value: AuthContextType = {
    firebaseUser,
    user,
    loading,
    login,
    register,
    logout,
    resetPassword,
    checkUsernameAvailable,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
