import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import heroImage from "@/assets/hero-travel.jpg";
import { DynamicLogo } from "@/components/DynamicLogo";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      forgotPasswordSchema.parse({ email });
      setLoading(true);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/reset-password",
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Failed to send reset link",
          description: error.message,
        });
      } else {
        setSuccess(true);
        toast({
          title: "Reset link sent!",
          description: "Check your email for the password reset link.",
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: error.errors[0].message,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-[#062016]/80" />
        </div>
        <div className="relative z-10 flex flex-col justify-center items-start p-16 text-primary-foreground">
          <Link to="/" className="inline-block transition-transform hover:scale-105 active:scale-95 mb-6">
            <DynamicLogo lightHeightClass="h-14" darkHeightClass="h-[74px]" />
          </Link>
          <p className="text-2xl font-light mb-4">Reset Your Password</p>
          <p className="text-lg opacity-90">
            Don't worry, we'll help you get back to your account securely.
          </p>
        </div>
      </motion.div>

      {/* Right Side - Form */}
      <motion.div
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background"
      >
        <div className="w-full max-w-md">
          <Link
            to="/login"
            className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to login
          </Link>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">Forgot Password</h2>
            <p className="text-muted-foreground">
              {success
                ? "We've sent a link to your email."
                : "Enter your email to receive a password reset link."}
            </p>
          </div>

          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-foreground"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-accent text-primary-foreground py-6 rounded-xl text-base font-semibold"
              >
                {loading ? "Sending link..." : "Send Reset Link"}
              </Button>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-sm text-foreground">
                If an account exists for <span className="font-semibold">{email}</span>, you will receive a reset link shortly.
              </p>
              <Button
                variant="outline"
                className="w-full py-6 rounded-xl font-semibold mt-4"
                onClick={() => setSuccess(false)}
              >
                Try another email
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
