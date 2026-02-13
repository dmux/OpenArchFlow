import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle, Github } from "lucide-react";

export function PrivacyInfo() {
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-primary hover:text-primary-foreground hover:bg-primary/90 bg-background/50 backdrop-blur border border-primary/20 rounded-full shadow-sm transition-all duration-300"
                    title="Privacy & About"
                >
                    <HelpCircle className="w-5 h-5" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-xl">
                <AlertDialogHeader>
                    <AlertDialogTitle>Author and Privacy</AlertDialogTitle>
                    <AlertDialogDescription className="text-left space-y-4 pt-4" asChild>
                        <div>
                            <div className="space-y-2">
                                <h4 className="font-semibold text-foreground">Privacy Policy</h4>
                                <p>
                                    This application operates <strong>entirely locally</strong> within your browser.
                                    The source code is open and available for inspection.
                                </p>
                                <p>
                                    <strong className="text-foreground">We do not collect</strong> any personal data, architectural diagrams, API keys, or usage information.
                                    All your work is saved only on your device's local storage or file system.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-semibold text-foreground">About the Application</h4>
                                <p>
                                    OpenArchFlow is designed to be a free and open tool for the community.
                                    It uses <strong>AI, Large Language Models (LLMs), AI Agents, and AWS MCP (Model Context Protocol)</strong> to generate cloud architecture diagrams from natural language descriptions and automatically create comprehensive technical documentation.
                                </p>
                                <p className="text-sm">
                                    Simply describe your AWS architecture in plain English, and the application will generate professional diagrams and specifications using advanced AI capabilities.
                                </p>
                                <div className="pt-2">
                                    <a
                                        href="https://github.com/dmux/OpenArchFlow"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        <Github className="w-4 h-4" />
                                        <span>View Source on GitHub</span>
                                    </a>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-semibold text-foreground">Author</h4>
                                <p>
                                    Developed by <strong>Rafael Sales</strong> (rafael.sales@gmail.com).
                                </p>
                                <p>
                                    Built by architects and engineers passionate about technology, specifically for the developer and architect community to use freely.
                                </p>
                            </div>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction>Got it</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
