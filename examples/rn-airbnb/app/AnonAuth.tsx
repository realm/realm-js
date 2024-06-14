import { useAuth } from "@realm/react"
import React, { useEffect } from "react"
import {Text} from "react-native"

export const AnonAuth = () => {
	const {result, logInWithAnonymous} = useAuth();

	useEffect(() => {
		logInWithAnonymous()
	})

	return <Text>Logging in</Text>
}
