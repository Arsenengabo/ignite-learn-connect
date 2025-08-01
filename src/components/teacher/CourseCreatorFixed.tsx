import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const CourseCreatorFixed: React.FC = () => {
  const [message, setMessage] = React.useState("Course Creator is working!");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Course Creator - Fixed Version</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{message}</p>
          <Button onClick={() => setMessage("Button clicked!")}>
            Test Button
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};