import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Rocket, Users, BarChart3, Settings, ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useState } from "react";
interface LandingPageProps {
  onGetStarted: () => void;
}
export const LandingPage = ({
  onGetStarted
}: LandingPageProps) => {
  return <div className="min-h-screen bg-background" style={{
    background: 'var(--gradient-hero)'
  }}>
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Rocket className="w-8 h-8 text-primary" />
              <span className="text-xl font-bold text-foreground">CodeX</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
              <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors">About</a>
              <ThemeToggle />
              <Button onClick={onGetStarted} variant="outline">
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <Rocket className="w-4 h-4 text-primary mr-2" />
            <span className="text-primary text-sm">AI-Powered Learning Platform</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
            Elevate Your Learning
            <br />
            <span className="bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
              with AI-Driven Education
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
            Transform your educational experience with our comprehensive platform designed for both teachers and students. 
            Create engaging courses, interactive quizzes, and competitive learning environments.
          </p>
          
          <Button onClick={onGetStarted} size="lg" className="bg-primary hover:bg-primary-dark text-primary-foreground px-8 py-4 text-lg rounded-xl transition-all duration-300" style={{
          boxShadow: 'var(--shadow-primary)'
        }}>
            Get Started Free
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              4 Power Features Everyone
              <br />
              Needs to See
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Our platform is packed with powerful features to help you streamline your learning process and boost your educational success.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="bg-card border-border hover:bg-card-hover transition-all duration-300 group">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Interactive Learning</h3>
                <p className="text-muted-foreground">Create and participate in interactive courses with real-time collaboration and feedback.</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border hover:bg-card-hover transition-all duration-300 group">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-lg bg-learning/10 flex items-center justify-center mb-4 group-hover:bg-learning/20 transition-colors">
                  <BarChart3 className="w-6 h-6 text-learning" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Track Progress</h3>
                <p className="text-muted-foreground">Monitor learning progress with detailed analytics and performance insights.</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border hover:bg-card-hover transition-all duration-300 group">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Rocket className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">AI-Powered Quizzes</h3>
                <p className="text-muted-foreground">Generate intelligent quizzes and assessments automatically using advanced AI.</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border hover:bg-card-hover transition-all duration-300 group">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-lg bg-achievement/10 flex items-center justify-center mb-4 group-hover:bg-achievement/20 transition-colors">
                  <Settings className="w-6 h-6 text-achievement" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Flexible Management</h3>
                <p className="text-muted-foreground">Customize learning paths and manage educational content with ease.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Affordable Plans for Every
              <br />
              Budget, Choose Yours
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              EduPlatform offers a range of pricing plans to fit every budget and level of need whether a small classroom or a large educational institution.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="bg-card border-border p-8 hover:bg-card-hover transition-all duration-300">
              <div className="text-center">
                <div className="inline-block px-4 py-2 rounded-full bg-muted text-muted-foreground text-sm mb-6">BASIC</div>
                <h3 className="text-3xl font-bold text-foreground mb-6">Free Plan</h3>
                <div className="space-y-4 mb-8">
                  <div className="flex items-center text-muted-foreground">
                    <CheckCircle className="w-5 h-5 text-success mr-3" />
                    <span>Up to 5 students</span>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <CheckCircle className="w-5 h-5 text-success mr-3" />
                    <span>Basic quiz features</span>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <CheckCircle className="w-5 h-5 text-success mr-3" />
                    <span>Limited storage</span>
                  </div>
                </div>
                <Button onClick={onGetStarted} variant="outline" className="w-full">
                  Get Started
                </Button>
              </div>
            </Card>

            <Card className="bg-card border-primary/50 p-8 hover:bg-card-hover transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary-light"></div>
              <div className="text-center">
                <div className="inline-block px-4 py-2 rounded-full bg-primary/20 text-primary text-sm mb-6">PROFESSIONAL</div>
                <h3 className="text-3xl font-bold text-foreground mb-6">Professional Plan</h3>
                <div className="space-y-4 mb-8">
                  <div className="flex items-center text-muted-foreground">
                    <CheckCircle className="w-5 h-5 text-success mr-3" />
                    <span>Unlimited students</span>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <CheckCircle className="w-5 h-5 text-success mr-3" />
                    <span>Advanced analytics</span>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <CheckCircle className="w-5 h-5 text-success mr-3" />
                    <span>AI quiz generation</span>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <CheckCircle className="w-5 h-5 text-success mr-3" />
                    <span>Priority support</span>
                  </div>
                </div>
                <Button onClick={onGetStarted} className="w-full bg-primary hover:bg-primary-dark">
                  Start Free Trial
                </Button>
              </div>
            </Card>

            <Card className="bg-card border-border p-8 hover:bg-card-hover transition-all duration-300">
              <div className="text-center">
                <div className="inline-block px-4 py-2 rounded-full bg-achievement/20 text-achievement text-sm mb-6">ENTERPRISE</div>
                <h3 className="text-3xl font-bold text-foreground mb-6">Enterprise Plan</h3>
                <div className="space-y-4 mb-8">
                  <div className="flex items-center text-muted-foreground">
                    <CheckCircle className="w-5 h-5 text-success mr-3" />
                    <span>Custom solutions</span>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <CheckCircle className="w-5 h-5 text-success mr-3" />
                    <span>Dedicated support</span>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <CheckCircle className="w-5 h-5 text-success mr-3" />
                    <span>White-label options</span>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <CheckCircle className="w-5 h-5 text-success mr-3" />
                    <span>API access</span>
                  </div>
                </div>
                <Button onClick={onGetStarted} variant="outline" className="w-full">
                  Contact Sales
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Ready to Transform Your Learning Experience?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of educators and students already using our platform to achieve better learning outcomes.
          </p>
          <Button onClick={onGetStarted} size="lg" className="bg-primary hover:bg-primary-dark text-primary-foreground px-8 py-4 text-lg rounded-xl transition-all duration-300" style={{
          boxShadow: 'var(--shadow-primary)'
        }}>
            Start Your Journey Today
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background/80 border-t border-border py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Rocket className="w-6 h-6 text-primary" />
                <span className="text-xl font-bold text-foreground">EduPlatform</span>
              </div>
              <p className="text-muted-foreground">
                Transforming education through innovative technology and AI-powered learning solutions.
              </p>
            </div>
            
            <div>
              <h3 className="text-foreground font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">About Us</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Careers</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-foreground font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li><a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">API</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-foreground font-semibold mb-4">Support</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Help Center</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Documentation</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border mt-8 pt-8 text-center">
            <p className="text-muted-foreground">© 2024 EduPlatform. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>;
};